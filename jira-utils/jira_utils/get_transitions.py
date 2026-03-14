"""Get available status transitions for a Jira issue."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_get_transitions(
    issue_key: str,
    *,
    client: JiraClient,
) -> dict:
    """Fetch available transitions for an issue."""
    return client.get(f"/rest/api/2/issue/{issue_key}/transitions")


@app.callback()
def main(
    issue_key: str = typer.Option(
        ..., "--issue-key", help="Jira issue key (e.g. GFD-42)"
    ),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Get available transitions for an issue."""
    from jira_utils._output import handle_error, output_json
    from jira_utils.client import build_client

    try:
        client = build_client()
        result = run_get_transitions(issue_key, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
