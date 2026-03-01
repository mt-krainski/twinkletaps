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


def run_claude(prompt: str, *, session_id: str, schema_path: Path) -> dict:
    """Run claude CLI with structured output and return parsed result."""
    cmd = [
        "claude",
        "-p",
        "--model",
        "sonnet",
        "--verbose",
        "--output-format",
        "json",
        "--session-id",
        session_id,
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
    """Handle a task in the Review column."""
    session_id = get_session(task["key"])
    print(f"  Resuming session {session_id}")
    raise NotImplementedError(f"Review handler not yet implemented for {task['key']}")


def handle_in_progress(task: dict) -> None:
    """Handle a task in the In Progress column."""
    raise NotImplementedError(
        f"In Progress handler not yet implemented for {task['key']}"
    )


def handle_to_do(task: dict) -> None:
    """Handle a task in the To Do column."""
    session_id = str(uuid.uuid4())
    save_session(task["key"], session_id)
    print(f"  New session {session_id}")
    raise NotImplementedError(f"To Do handler not yet implemented for {task['key']}")


def handle_planning(task: dict) -> None:
    """Handle a task in the Planning column."""
    session_id = str(uuid.uuid4())
    save_session(task["key"], session_id)
    print(f"  New session {session_id}")
    raise NotImplementedError(f"Planning handler not yet implemented for {task['key']}")


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
