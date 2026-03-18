"""Get versions for a Jira project."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_get_project_versions(
    project_key: str,
    *,
    client: JiraClient,
) -> list:
    """Fetch project versions."""
    return client.get(f"/rest/api/2/project/{project_key}/versions")


@app.callback()
def main(
    project_key: str = typer.Option(
        ..., "--project-key", help="Project key (e.g. GFD)"
    ),
    base_url: str = typer.Option(..., envvar="JIRA_URL", help="Jira base URL"),
    username: str = typer.Option(..., envvar="JIRA_USERNAME", help="Jira username"),
    api_token: str = typer.Option(..., envvar="JIRA_API_TOKEN", help="Jira API token"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Get versions for a Jira project."""
    from jira_utils._output import handle_error, output_json

    try:
        client = JiraClient(base_url=base_url.rstrip("/"), username=username, api_token=api_token)
        result = run_get_project_versions(project_key, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
