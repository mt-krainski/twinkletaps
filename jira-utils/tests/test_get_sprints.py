"""Tests for get_sprints command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.get_sprints import run_get_sprints


class TestRunGetSprints:
    def test_fetches_all_sprints(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {"values": [{"id": 1, "name": "Sprint 1"}]}

        result = run_get_sprints(1, client=client)

        assert len(result["values"]) == 1
        client.get.assert_called_once_with(
            "/rest/agile/1.0/board/1/sprint", params=None
        )

    def test_filters_by_state(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {"values": []}

        run_get_sprints(1, state="active", client=client)

        client.get.assert_called_once_with(
            "/rest/agile/1.0/board/1/sprint",
            params={"state": "active"},
        )
