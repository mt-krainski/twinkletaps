"""Tests for create_issue_link command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.create_issue_link import run_create_issue_link


class TestRunCreateIssueLink:
    def test_creates_link(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = None

        result = run_create_issue_link("Blocks", "GFD-1", "GFD-2", client=client)

        assert result is None
        client.post.assert_called_once_with(
            "/rest/api/2/issueLink",
            json={
                "type": {"name": "Blocks"},
                "inwardIssue": {"key": "GFD-1"},
                "outwardIssue": {"key": "GFD-2"},
            },
        )
