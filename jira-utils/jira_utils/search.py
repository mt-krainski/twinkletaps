"""Search Jira issues using JQL."""

from __future__ import annotations

import typer

from jira_utils.client import JiraClient

app = typer.Typer(invoke_without_command=True)


def run_search(
    jql: str,
    *,
    fields: str | None = None,
    limit: int = 50,
    next_page_token: str | None = None,
    client: JiraClient,
) -> dict:
    """Search issues by JQL. Returns the raw search result dict."""
    body: dict = {"jql": jql, "maxResults": limit}
    if fields:
        body["fields"] = [f.strip() for f in fields.split(",")]
    if next_page_token:
        body["nextPageToken"] = next_page_token
    # v3 search endpoint — v2 /rest/api/2/search was removed (410) on Jira Cloud.
    return client.post("/rest/api/3/search/jql", json=body)


@app.callback()
def main(
    jql: str = typer.Option(..., "--jql", help="JQL query string"),
    fields: str | None = typer.Option(
        None, "--fields", help="Comma-separated fields to return"
    ),
    limit: int = typer.Option(50, "--limit", help="Max results"),
    next_page_token: str | None = typer.Option(
        None, "--next-page-token", help="Pagination token from previous result"
    ),
    base_url: str = typer.Option(..., envvar="JIRA_URL", help="Jira base URL"),
    username: str = typer.Option(..., envvar="JIRA_USERNAME", help="Jira username"),
    api_token: str = typer.Option(..., envvar="JIRA_API_TOKEN", help="Jira API token"),
    pretty: bool = typer.Option(False, "--pretty", help="Pretty-print JSON"),
) -> None:
    """Search Jira issues using JQL."""
    from jira_utils._output import handle_error, output_json

    try:
        client = JiraClient(
            base_url=base_url.rstrip("/"), username=username, api_token=api_token
        )
        result = run_search(
            jql,
            fields=fields,
            limit=limit,
            next_page_token=next_page_token,
            client=client,
        )
        output_json(result, pretty=pretty)
    except Exception as exc:
        handle_error(exc)


if __name__ == "__main__":
    app()
