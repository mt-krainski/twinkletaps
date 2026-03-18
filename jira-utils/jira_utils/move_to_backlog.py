"""Move issues to the backlog."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_move_to_backlog(
    issues: str,
    *,
    client: JiraClient,
) -> dict | None:
    """Move issues to backlog. Returns None (204) on success."""
    issue_keys = [k.strip() for k in issues.split(",")]
    return client.post(
        "/rest/agile/1.0/backlog/issue",
        json={"issues": issue_keys},
    )


@app.callback()
def main(
    issues: str = typer.Option(..., "--issues", help="Comma-separated issue keys"),
    base_url: str = typer.Option(..., envvar="JIRA_URL", help="Jira base URL"),
    username: str = typer.Option(..., envvar="JIRA_USERNAME", help="Jira username"),
    api_token: str = typer.Option(..., envvar="JIRA_API_TOKEN", help="Jira API token"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Move issues to the backlog."""
    from jira_utils._output import handle_error, output_json

    try:
        client = JiraClient(base_url=base_url.rstrip("/"), username=username, api_token=api_token)
        result = run_move_to_backlog(issues, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
