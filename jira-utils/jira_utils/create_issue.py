"""Create a new Jira issue."""

from __future__ import annotations

import json

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_create_issue(
    project: str,
    summary: str,
    issue_type: str,
    *,
    description: str | None = None,
    assignee: str | None = None,
    components: str | None = None,
    additional_fields: str | None = None,
    client: JiraClient | None = None,
    env: dict[str, str] | None = None,
) -> dict:
    """Create an issue. Returns the created issue dict."""
    if client is None:
        client = JiraClient.from_env(env)

    fields: dict = {
        "project": {"key": project},
        "summary": summary,
        "issuetype": {"name": issue_type},
    }
    if description:
        fields["description"] = description
    if assignee:
        fields["assignee"] = {"name": assignee}
    if components:
        fields["components"] = [{"name": c.strip()} for c in components.split(",")]
    if additional_fields:
        fields.update(json.loads(additional_fields))

    return client.post("/rest/api/2/issue", json={"fields": fields})


@app.callback()
def main(
    project: str = typer.Option(..., "--project", help="Project key"),
    summary: str = typer.Option(..., "--summary", help="Issue summary"),
    type: str = typer.Option(..., "--type", help="Issue type (Task, Bug, etc.)"),
    description: str | None = typer.Option(None, "--description", help="Description"),
    assignee: str | None = typer.Option(None, "--assignee", help="Assignee username"),
    components: str | None = typer.Option(
        None, "--components", help="Comma-separated component names"
    ),
    additional_fields: str | None = typer.Option(
        None, "--additional-fields", help="Extra fields as JSON string"
    ),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Create a new Jira issue."""
    from jira_utils._output import handle_error, output_json

    try:
        result = run_create_issue(
            project,
            summary,
            type,
            description=description,
            assignee=assignee,
            components=components,
            additional_fields=additional_fields,
        )
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
