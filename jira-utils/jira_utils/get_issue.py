"""Get a Jira issue by key."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_get_issue(
    issue_key: str,
    *,
    fields: str | None = None,
    client: JiraClient,
) -> dict:
    """Fetch an issue. Returns the raw JSON dict from Jira."""
    params = {}
    if fields:
        params["fields"] = fields
    return client.get(f"/rest/api/2/issue/{issue_key}", params=params or None)


@app.callback()
def main(
    issue_key: str = typer.Option(
        ..., "--issue-key", help="Jira issue key (e.g. GFD-42)"
    ),
    fields: str | None = typer.Option(
        None, "--fields", help="Comma-separated fields to return"
    ),
    base_url: str = typer.Option(..., envvar="JIRA_URL", help="Jira base URL"),
    username: str = typer.Option(..., envvar="JIRA_USERNAME", help="Jira username"),
    api_token: str = typer.Option(..., envvar="JIRA_API_TOKEN", help="Jira API token"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Get a Jira issue by key."""
    from jira_utils._output import handle_error, output_json

    try:
        client = JiraClient(
            base_url=base_url.rstrip("/"), username=username, api_token=api_token
        )
        result = run_get_issue(issue_key, fields=fields, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
