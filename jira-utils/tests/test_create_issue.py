"""Tests for create_issue command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.create_issue import run_create_issue


class TestRunCreateIssue:
    def test_minimal_create(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = {"key": "GFD-99"}

        result = run_create_issue("GFD", "Test issue", "Task", client=client)

        assert result["key"] == "GFD-99"
        client.post.assert_called_once_with(
            "/rest/api/2/issue",
            json={
                "fields": {
                    "project": {"key": "GFD"},
                    "summary": "Test issue",
                    "issuetype": {"name": "Task"},
                }
            },
        )

    def test_with_all_options(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = {"key": "GFD-100"}
        client.resolve_account_id.return_value = "abc-123"

        run_create_issue(
            "GFD",
            "Full issue",
            "Bug",
            description="A bug",
            assignee="matt",
            components="Frontend,API",
            additional_fields='{"priority": {"name": "High"}}',
            client=client,
        )

        client.resolve_account_id.assert_called_once_with("matt")
        call_json = client.post.call_args[1]["json"]
        fields = call_json["fields"]
        assert fields["description"] == "A bug"
        assert fields["assignee"] == {"accountId": "abc-123"}
        assert fields["components"] == [{"name": "Frontend"}, {"name": "API"}]
        assert fields["priority"] == {"name": "High"}
