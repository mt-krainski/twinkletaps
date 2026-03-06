"""Tests for add_to_sprint command."""

from unittest.mock import MagicMock

from jira_utils.add_to_sprint import run_add_to_sprint
from jira_utils.client import JiraClient


class TestRunAddToSprint:
    def test_adds_issues(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = None

        result = run_add_to_sprint(10, "GFD-1,GFD-2", client=client)

        assert result is None
        client.post.assert_called_once_with(
            "/rest/agile/1.0/sprint/10/issue",
            json={"issues": ["GFD-1", "GFD-2"]},
        )
