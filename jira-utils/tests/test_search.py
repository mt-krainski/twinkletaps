"""Tests for search command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.search import run_search


class TestRunSearch:
    def test_basic_jql(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = {"issues": [], "total": 0}

        result = run_search("project = GFD", client=client)

        assert result == {"issues": [], "total": 0}
        client.post.assert_called_once_with(
            "/rest/api/3/search/jql",
            json={"jql": "project = GFD", "maxResults": 50},
        )

    def test_with_fields_and_pagination(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = {"issues": [{"key": "GFD-1"}], "total": 1}

        run_search(
            "project = GFD",
            fields="summary,status",
            limit=10,
            next_page_token="abc123",
            client=client,
        )

        client.post.assert_called_once_with(
            "/rest/api/3/search/jql",
            json={
                "jql": "project = GFD",
                "maxResults": 10,
                "fields": ["summary", "status"],
                "nextPageToken": "abc123",
            },
        )
