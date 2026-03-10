"""Tests for update_issue command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.update_issue import run_update_issue


class TestRunUpdateIssue:
    def test_update_fields(self):
        client = MagicMock(spec=JiraClient)
        client.put.return_value = None

        result = run_update_issue(
            "GFD-42",
            fields='{"summary": "Updated"}',
            client=client,
        )

        assert result is None
        client.put.assert_called_once_with(
            "/rest/api/2/issue/GFD-42",
            json={"fields": {"summary": "Updated"}},
        )

    def test_update_components(self):
        client = MagicMock(spec=JiraClient)
        client.put.return_value = None

        run_update_issue("GFD-42", components="Frontend,API", client=client)

        call_json = client.put.call_args[1]["json"]
        assert call_json["fields"]["components"] == [
            {"name": "Frontend"},
            {"name": "API"},
        ]

    def test_update_assignee(self):
        client = MagicMock(spec=JiraClient)
        client.put.return_value = None
        client.resolve_account_id.return_value = "abc-123"

        run_update_issue("GFD-42", assignee="Jane Doe", client=client)

        client.resolve_account_id.assert_called_once_with("Jane Doe")
        client.put.assert_called_once_with(
            "/rest/api/2/issue/GFD-42",
            json={"fields": {"assignee": {"accountId": "abc-123"}}},
        )

    def test_empty_update(self):
        client = MagicMock(spec=JiraClient)
        client.put.return_value = None

        run_update_issue("GFD-42", client=client)

        client.put.assert_called_once_with(
            "/rest/api/2/issue/GFD-42",
            json={},
        )
