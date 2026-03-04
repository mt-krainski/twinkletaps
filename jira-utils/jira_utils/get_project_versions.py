"""Get versions for a Jira project."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_get_project_versions(
    project_key: str,
    *,
    client: JiraClient | None = None,
    env: dict[str, str] | None = None,
) -> list:
    """Fetch project versions."""
    if client is None:
        client = JiraClient.from_env(env)
    return client.get(f"/rest/api/2/project/{project_key}/versions")


@app.callback()
def main(
    project_key: str = typer.Option(
        ..., "--project-key", help="Project key (e.g. GFD)"
    ),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Get versions for a Jira project."""
    from jira_utils._output import handle_error, output_json

    try:
        result = run_get_project_versions(project_key)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
