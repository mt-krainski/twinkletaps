"""Tests for get_issue command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.get_issue import run_get_issue


class TestRunGetIssue:
    def test_fetches_issue(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {"key": "GFD-42", "fields": {"summary": "Test"}}

        result = run_get_issue("GFD-42", client=client)

        assert result["key"] == "GFD-42"
        client.get.assert_called_once_with("/rest/api/2/issue/GFD-42", params=None)

    def test_passes_fields(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {"key": "GFD-42"}

        run_get_issue("GFD-42", fields="summary,status", client=client)

        client.get.assert_called_once_with(
            "/rest/api/2/issue/GFD-42",
            params={"fields": "summary,status"},
        )

    def test_builds_client_from_env(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {"key": "GFD-1"}

        result = run_get_issue("GFD-1", client=client)
        assert result["key"] == "GFD-1"
