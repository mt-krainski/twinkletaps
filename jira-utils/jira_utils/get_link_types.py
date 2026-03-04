"""Get available issue link types."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_get_link_types(
    *,
    filter: str | None = None,
    client: JiraClient | None = None,
    env: dict[str, str] | None = None,
) -> dict:
    """Fetch issue link types, optionally filtered by name substring."""
    if client is None:
        client = JiraClient.from_env(env)
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
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Get available issue link types."""
    from jira_utils._output import handle_error, output_json

    try:
        result = run_get_link_types(filter=filter)
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
