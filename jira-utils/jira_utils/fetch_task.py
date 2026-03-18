"""Fetch the next task for an agent from a Jira project board."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient
from jira_utils.search import run_search

app = typer.Typer(invoke_without_command=True)

# Status name -> column key mapping
_STATUS_MAP: dict[str, str] = {
    "Planning": "planning",
    "Plan Review": "plan_review",
    "To Do": "to_do",
    "In Progress": "in_progress",
    "Review": "review",
}

# Column priority order — in_progress first (anomalous state, fix ASAP)
_COLUMN_PRIORITY = ["in_progress", "review", "plan_review", "planning", "to_do"]

# Columns to skip during selection
_SKIP_COLUMNS: set[str] = set()

# WIP limits per column (epics excluded from count)
_WIP_LIMITS: dict[str, int] = {"to_do": 15, "review": 3, "plan_review": 3}

# Downstream columns checked for WIP limits before picking from a column
_DOWNSTREAM: dict[str, list[str]] = {
    "planning": ["plan_review", "to_do"],
    "plan_review": ["to_do"],
    "to_do": ["review"],
}

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
    board_state: dict[str, list[dict]], assigned_to_user_name: str
) -> tuple[dict | None, str | None, str]:
    """Select the next task for the given user."""
    for column in _COLUMN_PRIORITY:
        if column in _SKIP_COLUMNS:
            continue

        # Check downstream WIP limits
        downstreams = _DOWNSTREAM.get(column, [])
        blocked = False
        for ds in downstreams:
            if ds in _WIP_LIMITS:
                ds_tasks = board_state.get(ds, [])
                if _wip_count(ds_tasks) >= _WIP_LIMITS[ds]:
                    blocked = True
                    break
        if blocked:
            continue

        tasks = board_state.get(column, [])
        for task in tasks:
            assignee = (task["assignee"] or "").strip()
            if assignee != assigned_to_user_name.strip():
                continue
            if task["blocked_by"]:
                continue
            reason = (
                f"Selected {task['key']} from {column} column "
                f"(assigned to {assigned_to_user_name}, no active blockers)"
            )
            return task, column, reason

    return None, None, f"No eligible tasks found for {assigned_to_user_name}"


def _resolve_current_user(client: JiraClient) -> str:
    """Fetch the authenticated user's display name via the myself endpoint."""
    result = client.get("/rest/api/3/myself")
    if not result or not isinstance(result, dict):
        raise ValueError("Could not determine current user from Jira /myself endpoint")
    name = result.get("displayName", "")
    if not name:
        raise ValueError("Jira /myself endpoint returned no displayName")
    return name


def run_fetch_task(
    project: str,
    assigned_to_user_name: str | None = None,
    *,
    client: JiraClient,
) -> dict:
    """Fetch the next task for a user from a Jira project.

    Args:
        project: Jira project key.
        assigned_to_user_name: Jira display name to filter by. Falls back to
            the authenticated user via /myself endpoint.
        client: JiraClient instance.

    Returns a dict with board_state, selected_task, selected_column, reason.
    """
    if not project:
        raise ValueError("Project is required: pass --project or set JIRA_PROJECT_ID")

    if not assigned_to_user_name:
        assigned_to_user_name = _resolve_current_user(client)

    issues = _fetch_all_issues(project, client)
    board_state = _group_by_column(issues)
    selected_task, selected_column, reason = _select_task(
        board_state, assigned_to_user_name
    )

    return {
        "board_state": board_state,
        "selected_task": selected_task,
        "selected_column": selected_column,
        "reason": reason,
    }


@app.callback()
def main(
    project: str | None = typer.Option(
        None, "--project", envvar="JIRA_PROJECT_ID", help="Jira project key"
    ),
    assigned_to_user_name: str | None = typer.Option(
        None,
        "--assigned-to-user-name",
        envvar="JIRA_AGENT_USERNAME",
        help="Jira display name (defaults to authenticated user)",
    ),
    base_url: str = typer.Option(..., envvar="JIRA_URL", help="Jira base URL"),
    username: str = typer.Option(..., envvar="JIRA_USERNAME", help="Jira username"),
    api_token: str = typer.Option(..., envvar="JIRA_API_TOKEN", help="Jira API token"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Fetch the next task for a user from a Jira project board."""
    from jira_utils._output import handle_error, output_json

    try:
        client = JiraClient(base_url=base_url.rstrip("/"), username=username, api_token=api_token)
        result = run_fetch_task(project, assigned_to_user_name, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
