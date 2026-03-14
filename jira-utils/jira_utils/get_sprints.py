"""Get sprints from a Jira agile board."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_get_sprints(
    board_id: int,
    *,
    state: str | None = None,
    client: JiraClient,
) -> dict:
    """Fetch sprints from a board."""
    params: dict = {}
    if state:
        params["state"] = state
    return client.get(f"/rest/agile/1.0/board/{board_id}/sprint", params=params or None)


@app.callback()
def main(
    board_id: int = typer.Option(..., "--board-id", help="Board ID"),
    state: str | None = typer.Option(
        None, "--state", help="Sprint state (active, future, closed)"
    ),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Get sprints from a Jira agile board."""
    from jira_utils._output import handle_error, output_json
    from jira_utils.client import build_client

    try:
        client = build_client()
        result = run_get_sprints(board_id, state=state, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
