"""Add issues to a Jira sprint."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_add_to_sprint(
    sprint_id: int,
    issues: str,
    *,
    client: JiraClient,
) -> dict | None:
    """Add issues to a sprint. Returns None (204) on success."""
    issue_keys = [k.strip() for k in issues.split(",")]
    return client.post(
        f"/rest/agile/1.0/sprint/{sprint_id}/issue",
        json={"issues": issue_keys},
    )


@app.callback()
def main(
    sprint_id: int = typer.Option(..., "--sprint-id", help="Sprint ID"),
    issues: str = typer.Option(..., "--issues", help="Comma-separated issue keys"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Add issues to a Jira sprint."""
    from jira_utils._output import handle_error, output_json
    from jira_utils.client import build_client

    try:
        client = build_client()
        result = run_add_to_sprint(sprint_id, issues, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
