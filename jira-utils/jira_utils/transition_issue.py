"""Transition a Jira issue to a new status."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_transition_issue(
    issue_key: str,
    transition_id: str,
    *,
    comment: str | None = None,
    client: JiraClient,
) -> dict | None:
    """Transition an issue. Returns None (204) on success."""
    payload: dict = {"transition": {"id": transition_id}}
    if comment:
        payload["update"] = {"comment": [{"add": {"body": comment}}]}

    return client.post(f"/rest/api/2/issue/{issue_key}/transitions", json=payload)


@app.callback()
def main(
    issue_key: str = typer.Option(
        ..., "--issue-key", help="Jira issue key (e.g. GFD-42)"
    ),
    transition_id: str = typer.Option(..., "--transition-id", help="Transition ID"),
    comment: str | None = typer.Option(
        None, "--comment", help="Comment to add during transition"
    ),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Transition a Jira issue to a new status."""
    from jira_utils._output import handle_error, output_json
    from jira_utils.client import build_client

    try:
        client = build_client()
        result = run_transition_issue(
            issue_key, transition_id, comment=comment, client=client
        )
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
