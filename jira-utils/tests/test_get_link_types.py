"""Tests for get_link_types command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.get_link_types import run_get_link_types


class TestRunGetLinkTypes:
    def test_fetches_all(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {
            "issueLinkTypes": [
                {"name": "Blocks"},
                {"name": "Duplicate"},
            ]
        }

        result = run_get_link_types(client=client)

        assert len(result["issueLinkTypes"]) == 2
        client.get.assert_called_once_with("/rest/api/2/issueLinkType")

    def test_filters_by_name(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = {
            "issueLinkTypes": [
                {"name": "Blocks"},
                {"name": "Duplicate"},
                {"name": "Relates"},
            ]
        }

        result = run_get_link_types(filter="block", client=client)

        assert len(result["issueLinkTypes"]) == 1
        assert result["issueLinkTypes"][0]["name"] == "Blocks"
