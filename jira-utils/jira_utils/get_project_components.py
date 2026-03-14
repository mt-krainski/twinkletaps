"""Get components for a Jira project."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_get_project_components(
    project_key: str,
    *,
    client: JiraClient,
) -> list:
    """Fetch project components."""
    return client.get(f"/rest/api/2/project/{project_key}/components")


@app.callback()
def main(
    project_key: str = typer.Option(
        ..., "--project-key", help="Project key (e.g. GFD)"
    ),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Get components for a Jira project."""
    from jira_utils._output import handle_error, output_json
    from jira_utils.client import build_client

    try:
        client = build_client()
        result = run_get_project_components(project_key, client=client)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
