"""Fetch the next task for an agent from a Jira project board."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient
from jira_utils.search import run_search

app = typer.Typer(invoke_without_command=True)

# Status name -> column key mapping
_STATUS_MAP: dict[str, str] = {
    "Planning": "planning",
    "To Do": "to_do",
    "In Progress": "in_progress",
    "Review": "review",
}

# Column priority order (in_progress is in list but skipped via _SKIP_COLUMNS)
_COLUMN_PRIORITY = ["review", "planning", "in_progress", "to_do"]

# Columns to skip during selection
_SKIP_COLUMNS = {"in_progress"}

# WIP limits per column (epics excluded from count)
_WIP_LIMITS: dict[str, int] = {"to_do": 15, "review": 3}

# Downstream column mapping for WIP checks
_DOWNSTREAM: dict[str, str] = {"planning": "to_do", "to_do": "review"}

# Statuses that mean a blocker is resolved
_RESOLVED_STATUSES = {"Done", "Invalid"}

_SEARCH_FIELDS = "summary,status,issuetype,priority,assignee,parent,issuelinks,labels"


def _fetch_all_issues(project: str, client: JiraClient) -> list[dict]:
    """Fetch all active issues, paginating if needed."""
    jql = f"project = {project} AND status NOT IN (Done, Invalid) ORDER BY rank ASC"
    all_issues: list[dict] = []
    next_page_token: str | None = None

    while True:
        result = run_search(
            jql,
            fields=_SEARCH_FIELDS,
            limit=50,
            next_page_token=next_page_token,
            client=client,
        )
        all_issues.extend(result.get("issues", []))
        next_page_token = result.get("nextPageToken")
        if not next_page_token:
            break

    return all_issues


def _extract_blockers(issuelinks: list[dict]) -> list[dict]:
    """Extract active blockers from issuelinks."""
    blockers = []
    for link in issuelinks:
        if link.get("type", {}).get("inward") != "is blocked by":
            continue
        inward = link.get("inwardIssue")
        if not inward:
            continue
        status = inward.get("fields", {}).get("status", {}).get("name", "")
        if status in _RESOLVED_STATUSES:
            continue
        blockers.append(
            {
                "key": inward["key"],
                "summary": inward.get("fields", {}).get("summary", ""),
                "status": status,
            }
        )
    return blockers


def _normalize_issue(issue: dict) -> dict:
    """Normalize a raw Jira issue into the task shape."""
    fields = issue.get("fields", {})
    assignee_field = fields.get("assignee")
    parent_field = fields.get("parent")

    return {
        "key": issue["key"],
        "summary": fields.get("summary", ""),
        "issue_type": fields.get("issuetype", {}).get("name", ""),
        "priority": fields.get("priority", {}).get("name", ""),
        "assignee": assignee_field.get("displayName") if assignee_field else None,
        "parent_key": parent_field.get("key") if parent_field else None,
        "labels": fields.get("labels", []),
        "blocked_by": _extract_blockers(fields.get("issuelinks", [])),
    }


def _group_by_column(issues: list[dict]) -> dict[str, list[dict]]:
    """Group normalized issues by status column."""
    columns: dict[str, list[dict]] = {}
    for issue in issues:
        status_name = issue.get("fields", {}).get("status", {}).get("name", "")
        column = _STATUS_MAP.get(status_name)
        if column is None:
            continue
        normalized = _normalize_issue(issue)
        columns.setdefault(column, []).append(normalized)
    return columns


def _wip_count(tasks: list[dict]) -> int:
    """Count non-Epic tasks for WIP limit purposes."""
    return sum(1 for t in tasks if t["issue_type"] != "Epic")


def _select_task(
    board_state: dict[str, list[dict]], agent_name: str
) -> tuple[dict | None, str | None, str]:
    """Select the next task for the agent."""
    for column in _COLUMN_PRIORITY:
        if column in _SKIP_COLUMNS:
            continue

        # Check downstream WIP limit
        downstream = _DOWNSTREAM.get(column)
        if downstream and downstream in _WIP_LIMITS:
            downstream_tasks = board_state.get(downstream, [])
            if _wip_count(downstream_tasks) >= _WIP_LIMITS[downstream]:
                continue

        tasks = board_state.get(column, [])
        for task in tasks:
            assignee = (task["assignee"] or "").strip()
            if assignee != agent_name.strip():
                continue
            if task["blocked_by"]:
                continue
            reason = (
                f"Selected {task['key']} from {column} column "
                f"(assigned to {agent_name}, no active blockers)"
            )
            return task, column, reason

    return None, None, f"No eligible tasks found for {agent_name}"


def run_fetch_task(
    project: str,
    agent_name: str,
    *,
    client: JiraClient | None = None,
    env: dict[str, str] | None = None,
) -> dict:
    """Fetch the next task for an agent from a Jira project.

    Returns a dict with board_state, selected_task, selected_column, reason.
    """
    if client is None:
        client = JiraClient.from_env(env)

    issues = _fetch_all_issues(project, client)
    board_state = _group_by_column(issues)
    selected_task, selected_column, reason = _select_task(board_state, agent_name)

    return {
        "board_state": board_state,
        "selected_task": selected_task,
        "selected_column": selected_column,
        "reason": reason,
    }


@app.callback()
def main(
    project: str = typer.Option(..., "--project", help="Jira project key"),
    agent_name: str = typer.Option(..., "--agent-name", help="Agent display name"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Fetch the next task for an agent from a Jira project board."""
    from jira_utils._output import handle_error, output_json

    try:
        result = run_fetch_task(project, agent_name)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
