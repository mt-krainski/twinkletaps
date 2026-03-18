"""Get Jira agile boards."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_get_boards(
    *,
    project: str | None = None,
    name: str | None = None,
    type: str | None = None,
    client: JiraClient,
) -> dict:
    """Fetch agile boards, optionally filtered."""
    params: dict = {}
    if project:
        params["projectKeyOrId"] = project
    if name:
        params["name"] = name
    if type:
        params["type"] = type
    return client.get("/rest/agile/1.0/board", params=params or None)


@app.callback()
def main(
    project: str | None = typer.Option(None, "--project", help="Project key"),
    name: str | None = typer.Option(None, "--name", help="Board name filter"),
    type: str | None = typer.Option(None, "--type", help="Board type (scrum, kanban)"),
    base_url: str = typer.Option(..., envvar="JIRA_URL", help="Jira base URL"),
    username: str = typer.Option(..., envvar="JIRA_USERNAME", help="Jira username"),
    api_token: str = typer.Option(..., envvar="JIRA_API_TOKEN", help="Jira API token"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Get Jira agile boards."""
    from jira_utils._output import handle_error, output_json

    try:
        client = JiraClient(
            base_url=base_url.rstrip("/"), username=username, api_token=api_token
        )
        result = run_get_boards(project=project, name=name, type=type, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
