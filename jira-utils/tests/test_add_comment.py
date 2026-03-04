"""Tests for add_comment command."""

from unittest.mock import MagicMock

from jira_utils.add_comment import run_add_comment
from jira_utils.client import JiraClient


class TestRunAddComment:
    def test_adds_comment(self):
        client = MagicMock(spec=JiraClient)
        client.post.return_value = {"id": "10001", "body": "Hello"}

        result = run_add_comment("GFD-42", "Hello", client=client)

        assert result["body"] == "Hello"
        client.post.assert_called_once_with(
            "/rest/api/2/issue/GFD-42/comment",
            json={"body": "Hello"},
        )
