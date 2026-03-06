"""Tests for get_boards command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.get_boards import run_get_boards


class TestRunGetBoards:
    def test_fetches_all_boards(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {"values": [{"id": 1, "name": "GFD Board"}]}

        result = run_get_boards(client=client)

        assert len(result["values"]) == 1
        client.get.assert_called_once_with("/rest/agile/1.0/board", params=None)

    def test_filters_by_project(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {"values": []}

        run_get_boards(project="GFD", client=client)

        client.get.assert_called_once_with(
            "/rest/agile/1.0/board",
            params={"projectKeyOrId": "GFD"},
        )

    def test_filters_by_name_and_type(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {"values": []}

        run_get_boards(name="Sprint", type="scrum", client=client)

        client.get.assert_called_once_with(
            "/rest/agile/1.0/board",
            params={"name": "Sprint", "type": "scrum"},
        )
