"""Get available issue link types."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_get_link_types(
    *,
    filter: str | None = None,
    client: JiraClient,
) -> dict:
    """Fetch issue link types, optionally filtered by name substring."""
    result = client.get("/rest/api/2/issueLinkType")
    if filter:
        lower = filter.lower()
        result["issueLinkTypes"] = [
            lt
            for lt in result.get("issueLinkTypes", [])
            if lower in lt.get("name", "").lower()
        ]
    return result


@app.callback()
def main(
    filter: str | None = typer.Option(
        None, "--filter", help="Filter link types by name substring"
    ),
    base_url: str = typer.Option(..., envvar="JIRA_URL", help="Jira base URL"),
    username: str = typer.Option(..., envvar="JIRA_USERNAME", help="Jira username"),
    api_token: str = typer.Option(..., envvar="JIRA_API_TOKEN", help="Jira API token"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Get available issue link types."""
    from jira_utils._output import handle_error, output_json

    try:
        client = JiraClient(base_url=base_url.rstrip("/"), username=username, api_token=api_token)
        result = run_get_link_types(filter=filter, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
