"""Tests for transition_issue command."""

from unittest.mock import MagicMock

from jira_utils.client import JiraClient
from jira_utils.transition_issue import run_transition_issue


class TestRunTransitionIssue:
    def test_basic_transition(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = None

        result = run_transition_issue("GFD-42", "21", client=client)

        assert result is None
        client.post.assert_called_once_with(
            "/rest/api/2/issue/GFD-42/transitions",
            json={"transition": {"id": "21"}},
        )

    def test_transition_with_comment(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = None

        run_transition_issue("GFD-42", "21", comment="Starting work", client=client)

        call_json = client.post.call_args[1]["json"]
        assert call_json["transition"] == {"id": "21"}
        assert call_json["update"]["comment"] == [{"add": {"body": "Starting work"}}]
