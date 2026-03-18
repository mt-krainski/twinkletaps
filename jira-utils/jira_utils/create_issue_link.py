"""Create a link between two Jira issues."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_create_issue_link(
    link_type: str,
    inward: str,
    outward: str,
    *,
    client: JiraClient,
) -> dict | None:
    """Create an issue link. Returns None (201/204) on success."""
    return client.post(
        "/rest/api/2/issueLink",
        json={
            "type": {"name": link_type},
            "inwardIssue": {"key": inward},
            "outwardIssue": {"key": outward},
        },
    )


@app.callback()
def main(
    type: str = typer.Option(..., "--type", help="Link type name (e.g. Blocks)"),
    inward: str = typer.Option(..., "--inward", help="Inward issue key"),
    outward: str = typer.Option(..., "--outward", help="Outward issue key"),
    base_url: str = typer.Option(..., envvar="JIRA_URL", help="Jira base URL"),
    username: str = typer.Option(..., envvar="JIRA_USERNAME", help="Jira username"),
    api_token: str = typer.Option(..., envvar="JIRA_API_TOKEN", help="Jira API token"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Create a link between two Jira issues."""
    from jira_utils._output import handle_error, output_json

    try:
        client = JiraClient(
            base_url=base_url.rstrip("/"), username=username, api_token=api_token
        )
        result = run_create_issue_link(type, inward, outward, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
