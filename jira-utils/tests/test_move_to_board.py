"""Tests for move_to_board command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.move_to_board import run_move_to_board


class TestRunMoveToBoard:
    def test_moves_issues(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = None

        result = run_move_to_board(1, "GFD-43,GFD-44", client=client)

        assert result is None
        client.post.assert_called_once_with(
            "/rest/agile/1.0/board/1/issue",
            json={"issues": ["GFD-43", "GFD-44"]},
        )

    def test_single_issue(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = None

        run_move_to_board(1, "GFD-43", client=client)

        client.post.assert_called_once_with(
            "/rest/agile/1.0/board/1/issue",
            json={"issues": ["GFD-43"]},
        )
