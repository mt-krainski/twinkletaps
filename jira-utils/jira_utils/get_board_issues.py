"""Get issues from a Jira agile board."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_get_board_issues(
    board_id: int,
    *,
    jql: str | None = None,
    fields: str | None = None,
    limit: int = 50,
    start_at: int = 0,
    client: JiraClient | None = None,
    env: dict[str, str] | None = None,
) -> dict:
    """Fetch issues from a board."""
    if client is None:
        client = JiraClient.from_env(env)
    params: dict = {"maxResults": limit, "startAt": start_at}
    if jql:
        params["jql"] = jql
    if fields:
        params["fields"] = fields
    return client.get(f"/rest/agile/1.0/board/{board_id}/issue", params=params)


@app.callback()
def main(
    board_id: int = typer.Option(..., "--board-id", help="Board ID"),
    jql: str | None = typer.Option(None, "--jql", help="JQL filter"),
    fields: str | None = typer.Option(None, "--fields", help="Comma-separated fields"),
    limit: int = typer.Option(50, "--limit", help="Max results"),
    start_at: int = typer.Option(0, "--start-at", help="Pagination offset"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Get issues from a Jira agile board."""
    from jira_utils._output import handle_error, output_json

    try:
        result = run_get_board_issues(
            board_id, jql=jql, fields=fields, limit=limit, start_at=start_at
        )
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
