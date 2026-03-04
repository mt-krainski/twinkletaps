"""Add a comment to a Jira issue."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_add_comment(
    issue_key: str,
    body: str,
    *,
    client: JiraClient | None = None,
    env: dict[str, str] | None = None,
) -> dict:
    """Add a comment. Returns the created comment dict."""
    if client is None:
        client = JiraClient.from_env(env)
    return client.post(f"/rest/api/2/issue/{issue_key}/comment", json={"body": body})


@app.callback()
def main(
    issue_key: str = typer.Option(
        ..., "--issue-key", help="Jira issue key (e.g. GFD-42)"
    ),
    body: str = typer.Option(..., "--body", help="Comment text"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Add a comment to a Jira issue."""
    from jira_utils._output import handle_error, output_json

    try:
        result = run_add_comment(issue_key, body)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
