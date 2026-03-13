"""Ticket processing loop — fetches Jira board state and processes tasks."""

import json
import os
import subprocess
import uuid
from pathlib import Path
from typing import Annotated, Any

import typer
from dotenv import load_dotenv
from jira_utils.fetch_task import run_fetch_task

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PACKAGE_ROOT.parent
SESSIONS_FILE = PACKAGE_ROOT / "sessions.jsonl"

PERMISSIONS_INSTRUCTION = (
    " If any tool use or command is denied due to permission settings, "
    "stop and clearly explain which operation was blocked and what "
    "permission is needed. Do not attempt workarounds."
)


def _claude_base_cmd(*, session_id: str, skip_permissions: bool = False) -> list[str]:
    """Build the common prefix for all claude CLI invocations."""
    cmd = [
        "claude",
        "-p",
        "--debug",
        "--model",
        "opus",
        "--verbose",
    ]
    if skip_permissions:
        cmd.append("--dangerously-skip-permissions")
    cmd.extend(["--session-id", session_id])
    return cmd


SESSION_CONFLICT_MSG = "is already in use"


def _swap_session_to_resume(cmd: list[str]) -> list[str]:
    """Replace --session-id with --resume in a claude command."""
    return ["--resume" if arg == "--session-id" else arg for arg in cmd]


def _run_with_session_retry(
    cmd: list[str], **kwargs: Any
) -> subprocess.CompletedProcess[str]:
    """Run a subprocess, retrying with --resume on session-id conflict.

    On the first attempt stderr is always captured so we can detect the
    "already in use" error.  On retry the original kwargs are restored
    (preserving streaming / interactive behaviour).
    """
    first_kwargs = dict(kwargs)
    if not kwargs.get("capture_output"):
        first_kwargs["stderr"] = subprocess.PIPE
        first_kwargs.setdefault("text", True)

    try:
        return subprocess.run(cmd, **first_kwargs, check=True)  # noqa: S603
    except subprocess.CalledProcessError as exc:
        stderr_text = exc.stderr or ""
        if isinstance(stderr_text, bytes):
            stderr_text = stderr_text.decode(errors="replace")
        if SESSION_CONFLICT_MSG in stderr_text:
            return subprocess.run(  # noqa: S603
                _swap_session_to_resume(cmd), **kwargs, check=True
            )
        raise


def run_claude_task(
    prompt: str, *, session_id: str, skip_permissions: bool = False
) -> None:
    """Run claude CLI for task execution, streaming output to the terminal."""
    if not skip_permissions:
        prompt += PERMISSIONS_INSTRUCTION
    cmd = [
        *_claude_base_cmd(session_id=session_id, skip_permissions=skip_permissions),
        prompt,
    ]
    _run_with_session_retry(cmd, cwd=REPO_ROOT)


def save_session(task_key: str, session_id: str) -> None:
    """Append a task_key → session_id mapping to the sessions file."""
    record = {"task_key": task_key, "session_id": session_id}
    with open(SESSIONS_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")


def get_session(task_key: str) -> str:
    """Look up the session_id for a task_key.

    Returns the most recent session_id recorded for the given key.

    Raises:
        KeyError: If no session exists for the task_key.
    """
    if not SESSIONS_FILE.exists():
        raise KeyError(f"No session found for {task_key} (sessions file missing)")

    session_id = None
    with open(SESSIONS_FILE) as f:
        for line in f:
            record = json.loads(line)
            if record["task_key"] == task_key:
                session_id = record["session_id"]

    if session_id is None:
        raise KeyError(f"No session found for {task_key}")
    return session_id


def _task_has_label(task: dict, label: str) -> bool:
    """Check if a task has a specific label."""
    return label in (task.get("labels") or [])


def handle_review(task: dict, *, skip_permissions: bool = False) -> None:
    """Handle a task in the Review column — route by label."""
    session_id = get_session(task["key"])
    human_id = os.environ["HUMAN_ATLASSIAN_ID"]
    print(f"  Resuming session {session_id}")

    if _task_has_label(task, "plan"):
        _handle_plan_review(
            task,
            session_id=session_id,
            human_id=human_id,
            skip_permissions=skip_permissions,
        )
    else:
        _handle_implementation_review(
            task,
            session_id=session_id,
            human_id=human_id,
            skip_permissions=skip_permissions,
        )


def _handle_plan_review(
    task: dict, *, session_id: str, human_id: str, skip_permissions: bool
) -> None:
    """Handle a plan review task — read comments, create issues or iterate."""
    run_claude_task(
        f"Task {task['key']} ({task['summary']}) is a planning task in Review "
        "(it has the 'plan' label). "
        "Read the latest comments on the Jira task to determine the human's intent. "
        "If the human approved the plan (e.g. 'approved', 'looks good', 'lgtm'), "
        "create the implementation Epic + Tasks from the plan in the task description "
        "using the /plan skill's post-approval flow, then transition this planning "
        "task to Done (transition ID 31). "
        "If the human left change requests or questions, address the feedback, "
        "update the plan in the task description, and reassign back to "
        f"'{human_id}'. Keep the task in Review. "
        "If there is NO new comment from the human, reassign back to "
        f"'{human_id}' with a comment asking for explicit approval or feedback. "
        "Silence does NOT mean approval.",
        session_id=session_id,
        skip_permissions=skip_permissions,
    )


def _handle_implementation_review(
    task: dict, *, session_id: str, human_id: str, skip_permissions: bool
) -> None:
    """Handle an implementation review task — address PR feedback."""
    run_claude_task(
        f"Task {task['key']} ({task['summary']}) is in Review. "
        "Check the comments on the Jira task AND on the associated pull request. "
        "Make sure you are on the correct branch for this task. "
        "Address any review feedback using the /address-pr skill. "
        "When done, commit and push the changes. "
        "Add relevant comments to the Jira task and/or pull request. "
        f"Then reassign the Jira task to '{human_id}'.",
        session_id=session_id,
        skip_permissions=skip_permissions,
    )


def handle_in_progress(task: dict, *, skip_permissions: bool = False) -> None:
    """Handle a task in the In Progress column (skipped)."""
    raise NotImplementedError(
        f"In Progress handler not yet implemented for {task['key']}"
    )


def handle_to_do(task: dict, *, skip_permissions: bool = False) -> None:
    """Handle a task in the To Do column — implement it."""
    base_branch = os.environ["BASE_BRANCH"]
    session_id = str(uuid.uuid4())
    save_session(task["key"], session_id)
    print(f"  New session {session_id}")
    run_claude_task(
        f"Implement Jira task {task['key']}: {task['summary']}. "
        f"Use '{base_branch}' as the base branch for development and as the "
        "PR target. Create a feature branch from it. "
        "Implement the task following the repo's conventions and skills "
        "(use the /execute skill). "
        "When done, wrap up: lint, test, commit, and create a PR "
        "(use the /wrap skill).",
        session_id=session_id,
        skip_permissions=skip_permissions,
    )


def handle_planning(task: dict, *, skip_permissions: bool = False) -> None:
    """Handle a task in the Planning column — produce a plan for human review."""
    human_id = os.environ["HUMAN_ATLASSIAN_ID"]
    session_id = str(uuid.uuid4())
    save_session(task["key"], session_id)
    print(f"  New session {session_id}")
    run_claude_task(
        f"Plan the implementation of Jira task {task['key']}: {task['summary']}. "
        "Use the /plan skill to analyze the codebase and produce a plan. "
        "This is invoked through a script (ticket-loop). Your only way to "
        "communicate back to the user is via Jira. "
        "After producing the plan: "
        f"1. Add the 'plan' label to task {task['key']} using jira-utils update-issue. "
        f"2. Write the plan to the task description using jira-utils update-issue. "
        f"3. Reassign the task to '{human_id}'. "
        "4. Transition the task to Review (transition ID 2). "
        "Do NOT create implementation tickets — that happens after human approval. "
        "If you have questions, write your plan so far into the Jira ticket, ask "
        "questions as a comment, and reassign the issue to the user.",
        session_id=session_id,
        skip_permissions=skip_permissions,
    )


COLUMN_HANDLERS = {
    "review": handle_review,
    "in_progress": handle_in_progress,
    "to_do": handle_to_do,
    "planning": handle_planning,
}


def resume_session(issue_key: str, *, skip_permissions: bool = False) -> None:
    """Drop into an interactive Claude session for a previously started issue."""
    session_id = get_session(issue_key)
    print(f"  Resuming session {session_id} for {issue_key}")
    cmd = ["claude", "--session-id", session_id, "--verbose"]
    if skip_permissions:
        cmd.append("--dangerously-skip-permissions")
    _run_with_session_retry(cmd, cwd=REPO_ROOT)


def _run_loop(*, skip_permissions: bool = False) -> None:
    """Fetch the board and process the next agent task."""
    agent_name = os.environ["JIRA_AGENT_USERNAME"]
    print(f"Agent: {agent_name}")

    print("Fetching board state from Jira...")
    result = run_fetch_task(project="GFD", assigned_to_user_name=agent_name)

    board_state = result["board_state"]
    for col, issues in board_state.items():
        print(f"  {col}: {len(issues)} issue(s)")
    print(f"Selection: {result['reason']}")

    task = result["selected_task"]
    if task is None:
        print("No tasks assigned to agent.")
        return

    column = result["selected_column"]
    print(f"Selected: {task['key']} ({task['summary']}) from column '{column}'")
    print(f"Invoking {column} handler...")

    handler = COLUMN_HANDLERS[column]
    handler(task, skip_permissions=skip_permissions)


app = typer.Typer()


@app.callback(invoke_without_command=True)
def main(
    resume: Annotated[
        str | None,
        typer.Option(help="Resume the Claude session for a Jira issue (e.g. GFD-42)."),
    ] = None,
    dangerously_skip_permissions: Annotated[
        bool,
        typer.Option(
            "--dangerously-skip-permissions",
            help="Pass --dangerously-skip-permissions to the Claude CLI, "
            "auto-approving all tool use without permission checks.",
        ),
    ] = False,
) -> None:
    """Run the ticket processing loop, or resume a specific issue session."""
    load_dotenv()
    if resume is not None:
        print(f"Resume mode: {resume}")
        resume_session(resume, skip_permissions=dangerously_skip_permissions)
    else:
        print("Running ticket loop...")
        _run_loop(skip_permissions=dangerously_skip_permissions)


if __name__ == "__main__":
    app()
