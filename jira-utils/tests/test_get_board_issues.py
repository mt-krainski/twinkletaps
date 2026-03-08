"""Tests for get_board_issues command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.get_board_issues import run_get_board_issues


class TestRunGetBoardIssues:
    def test_fetches_issues(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {"issues": [{"key": "GFD-1"}], "total": 1}

        result = run_get_board_issues(1, client=client)

        assert result["total"] == 1
        client.get.assert_called_once_with(
            "/rest/agile/1.0/board/1/issue",
            params={"maxResults": 50, "startAt": 0},
        )

    def test_with_jql_and_fields(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {"issues": [], "total": 0}

        run_get_board_issues(
            1, jql="status = 'To Do'", fields="summary", limit=10, client=client
        )

        client.get.assert_called_once_with(
            "/rest/agile/1.0/board/1/issue",
            params={
                "maxResults": 10,
                "startAt": 0,
                "jql": "status = 'To Do'",
                "fields": "summary",
            },
        )
