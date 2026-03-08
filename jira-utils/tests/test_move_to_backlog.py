"""Tests for move_to_backlog command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.move_to_backlog import run_move_to_backlog


class TestRunMoveToBacklog:
    def test_moves_issues(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = None

        result = run_move_to_backlog("GFD-43,GFD-44", client=client)

        assert result is None
        client.post.assert_called_once_with(
            "/rest/agile/1.0/backlog/issue",
            json={"issues": ["GFD-43", "GFD-44"]},
        )
