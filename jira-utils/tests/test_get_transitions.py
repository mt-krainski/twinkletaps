"""Tests for get_transitions command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.get_transitions import run_get_transitions


class TestRunGetTransitions:
    def test_fetches_transitions(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {
            "transitions": [
                {"id": "11", "name": "To Do"},
                {"id": "21", "name": "In Progress"},
            ]
        }

        result = run_get_transitions("GFD-42", client=client)

        assert len(result["transitions"]) == 2
        client.get.assert_called_once_with("/rest/api/2/issue/GFD-42/transitions")
