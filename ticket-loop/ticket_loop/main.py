"""Ticket processing loop — fetches Jira board state and processes tasks."""

import json
import os
import subprocess
import uuid
from pathlib import Path

from dotenv import load_dotenv

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PACKAGE_ROOT.parent
SCHEMA_DIR = PACKAGE_ROOT / "schemas"
SESSIONS_FILE = PACKAGE_ROOT / "sessions.jsonl"

PROMPT_FETCH_BOARD = (
    "Fetch all issues from Jira project GFD where status not in (Done, Invalid), "
    "using jira_search with limit 50. Paginate with start_at if there are more. "
    "Group them by status column: Planning → planning, To Do → to_do, "
    "In Progress → in_progress, Review → review. Within each column, "
    "preserve the order returned by Jira (rank order). For each issue, "
    "extract: key, summary, issue_type (Epic or Task), priority, assignee "
    "display name (null if unassigned), parent_key (parent epic key, null for "
    "epics themselves), blocked_by (from issuelinks where type is 'Blocks' and "
    "the link direction is inward — meaning those issues block this one), and "
    "labels."
)


def _claude_base_cmd(*, session_id: str) -> list[str]:
    """Build the common prefix for all claude CLI invocations."""
    return [
        "claude",
        "-p",
        "--model",
        "sonnet",
        "--verbose",
        "--dangerously-skip-permissions",
        "--session-id",
        session_id,
    ]


def run_claude(prompt: str, *, session_id: str, schema_path: Path) -> dict:
    """Run claude CLI with structured output and return parsed result."""
    cmd = [
        *_claude_base_cmd(session_id=session_id),
        "--output-format",
        "json",
        "--json-schema",
        schema_path.read_text(),
        prompt,
    ]
    result = subprocess.run(  # noqa: S603
        cmd,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    output = json.loads(result.stdout)
    if isinstance(output, list):
        envelope = output[-1]
    else:
        envelope = output
    return envelope["structured_output"]


def run_claude_task(prompt: str, *, session_id: str) -> None:
    """Run claude CLI for task execution, streaming output to the terminal."""
    cmd = [*_claude_base_cmd(session_id=session_id), prompt]
    subprocess.run(cmd, cwd=REPO_ROOT, check=True)  # noqa: S603


def fetch_board_state(session_id: str) -> dict:
    """Fetch current Jira board state grouped by column."""
    return run_claude(
        PROMPT_FETCH_BOARD,
        session_id=session_id,
        schema_path=SCHEMA_DIR / "board_state.json",
    )


COLUMNS_RIGHT_TO_LEFT = ["review", "in_progress", "to_do", "planning"]
SKIP_COLUMNS = {"in_progress"}


def find_agent_task(board_state: dict, agent_name: str) -> tuple[str, dict] | None:
    """Find the right-most top-most task assigned to the agent.

    Scans columns from right to left (review → planning), returning the
    first task whose assignee matches agent_name.

    Returns:
        (column, task) tuple, or None if no task is assigned to the agent.
    """
    for column in COLUMNS_RIGHT_TO_LEFT:
        if column in SKIP_COLUMNS:
            continue
        for task in board_state.get(column, []):
            if task.get("assignee") == agent_name:
                return column, task
    return None


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


def handle_review(task: dict) -> None:
    """Handle a task in the Review column — address feedback and reassign."""
    session_id = get_session(task["key"])
    human_id = os.environ["HUMAN_ATLASSIAN_ID"]
    print(f"  Resuming session {session_id}")
    run_claude_task(
        f"Task {task['key']} ({task['summary']}) is in Review. "
        "Check the comments on the Jira task AND on the associated pull request. "
        "Make sure you are on the correct branch for this task. "
        "Address any review feedback using the /address-pr skill. "
        "When done, commit and push the changes. "
        "Add relevant comments to the Jira task and/or pull request. "
        f"Then reassign the Jira task to '{human_id}'.",
        session_id=session_id,
    )


def handle_in_progress(task: dict) -> None:
    """Handle a task in the In Progress column (skipped)."""
    raise NotImplementedError(
        f"In Progress handler not yet implemented for {task['key']}"
    )


def handle_to_do(task: dict) -> None:
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
    )


def handle_planning(task: dict) -> None:
    """Handle a task in the Planning column — plan the implementation."""
    session_id = str(uuid.uuid4())
    save_session(task["key"], session_id)
    print(f"  New session {session_id}")
    run_claude_task(
        f"Plan the implementation of Jira task {task['key']}: {task['summary']}. "
        "Use the /plan skill to analyze the codebase and break down the work "
        "into smaller, reviewable tasks in Jira.",
        session_id=session_id,
    )


COLUMN_HANDLERS = {
    "review": handle_review,
    "in_progress": handle_in_progress,
    "to_do": handle_to_do,
    "planning": handle_planning,
}


def main() -> None:
    """Run the ticket processing loop."""
    load_dotenv()
    agent_name = os.environ["JIRA_AGENT_USERNAME"]

    board_session_id = str(uuid.uuid4())
    board_state = fetch_board_state(board_session_id)

    result = find_agent_task(board_state, agent_name)
    if result is None:
        print("No tasks assigned to agent.")
        return

    column, task = result
    print(f"Processing {task['key']} ({task['summary']}) from {column}")

    handler = COLUMN_HANDLERS[column]
    handler(task)


if __name__ == "__main__":
    main()
