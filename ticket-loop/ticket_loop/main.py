"""Ticket processing loop — fetches Jira board state and processes tasks."""

import json
import subprocess
import uuid
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schemas"

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


def main() -> None:
    """Run the ticket processing loop."""
    session_id = str(uuid.uuid4())

    # Step 1: Fetch board state
    board_state = fetch_board_state(session_id)

    # Future steps will consume board_state with the same session_id
    print(json.dumps(board_state, indent=2))


if __name__ == "__main__":
    main()
