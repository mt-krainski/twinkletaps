"""Tests for get_project_versions command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.get_project_versions import run_get_project_versions


class TestRunGetProjectVersions:
    def test_fetches_versions(self):
        client = MagicMock(spec=JiraClient)
        client.get.return_value = [{"name": "v1.0"}, {"name": "v2.0"}]

        result = run_get_project_versions("GFD", client=client)

        assert len(result) == 2
        client.get.assert_called_once_with("/rest/api/2/project/GFD/versions")
