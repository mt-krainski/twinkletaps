"""Update an existing Jira issue."""

from __future__ import annotations

import json

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_update_issue(
    issue_key: str,
    *,
    fields: str | None = None,
    components: str | None = None,
    client: JiraClient | None = None,
    env: dict[str, str] | None = None,
) -> dict | None:
    """Update an issue's fields. Returns None (204) on success."""
    if client is None:
        client = JiraClient.from_env(env)

    payload: dict = {}
    if fields:
        payload["fields"] = json.loads(fields)
    if components:
        payload.setdefault("fields", {})["components"] = [
            {"name": c.strip()} for c in components.split(",")
        ]

    return client.put(f"/rest/api/2/issue/{issue_key}", json=payload)


@app.callback()
def main(
    issue_key: str = typer.Option(
        ..., "--issue-key", help="Jira issue key (e.g. GFD-42)"
    ),
    fields: str | None = typer.Option(
        None, "--fields", help="Fields to update as JSON string"
    ),
    components: str | None = typer.Option(
        None, "--components", help="Comma-separated component names"
    ),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Update a Jira issue."""
    from jira_utils._output import handle_error, output_json

    try:
        result = run_update_issue(issue_key, fields=fields, components=components)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
