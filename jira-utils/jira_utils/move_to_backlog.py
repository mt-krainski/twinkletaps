"""Move issues to the backlog."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_move_to_backlog(
    issues: str,
    *,
    client: JiraClient | None = None,
    env: dict[str, str] | None = None,
) -> dict | None:
    """Move issues to backlog. Returns None (204) on success."""
    if client is None:
        client = JiraClient.from_env(env)
    issue_keys = [k.strip() for k in issues.split(",")]
    return client.post(
        "/rest/agile/1.0/backlog/issue",
        json={"issues": issue_keys},
    )


@app.callback()
def main(
    issues: str = typer.Option(..., "--issues", help="Comma-separated issue keys"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Move issues to the backlog."""
    from jira_utils._output import handle_error, output_json

    try:
        result = run_move_to_backlog(issues)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
