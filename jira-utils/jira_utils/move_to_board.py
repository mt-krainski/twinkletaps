"""Move issues to a Jira agile board."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_move_to_board(
    board_id: int,
    issues: str,
    *,
    client: JiraClient,
) -> dict | None:
    """Move issues onto a board. Returns None (204) on success."""
    issue_keys = [k.strip() for k in issues.split(",")]
    return client.post(
        f"/rest/agile/1.0/board/{board_id}/issue",
        json={"issues": issue_keys},
    )


@app.callback()
def main(
    board_id: int = typer.Option(..., "--board-id", help="Board ID"),
    issues: str = typer.Option(..., "--issues", help="Comma-separated issue keys"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Move issues to a Jira agile board."""
    from jira_utils._output import handle_error, output_json
    from jira_utils.client import build_client

    try:
        client = build_client()
        result = run_move_to_board(board_id, issues, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
