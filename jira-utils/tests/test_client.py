"""Tests for JiraClient."""

from unittest.mock import MagicMock, patch

import pytest

from jira_utils.client import JiraApiError, JiraClient


class TestFromEnv:
    def test_builds_from_env_dict(self):
        env = {
            "JIRA_URL": "https://example.atlassian.net/",
            "JIRA_USERNAME": "user@example.com",
            "JIRA_API_TOKEN": "tok123",
        }
        client = JiraClient.from_env(env)
        assert client.base_url == "https://example.atlassian.net"
        assert client.username == "user@example.com"
        assert client.api_token == "tok123"

    def test_strips_trailing_slash(self):
        env = {
            "JIRA_URL": "https://x.atlassian.net///",
            "JIRA_USERNAME": "u",
            "JIRA_API_TOKEN": "t",
        }
        client = JiraClient.from_env(env)
        assert client.base_url == "https://x.atlassian.net"

    @pytest.mark.parametrize("missing", ["JIRA_URL", "JIRA_USERNAME", "JIRA_API_TOKEN"])
    def test_raises_on_missing_var(self, missing):
        env = {
            "JIRA_URL": "https://x.atlassian.net",
            "JIRA_USERNAME": "u",
            "JIRA_API_TOKEN": "t",
        }
        del env[missing]
        with pytest.raises(ValueError, match=missing):
            JiraClient.from_env(env)


class TestRequest:
    def _make_client(self):
        return JiraClient(
            base_url="https://jira.test",
            username="user",
            api_token="token",
        )

    @patch("jira_utils.client.httpx.request")
    def test_get_success(self, mock_request):
        resp = MagicMock()
        resp.status_code = 200
        resp.is_success = True
        resp.json.return_value = {"key": "GFD-1"}
        mock_request.return_value = resp

        result = self._make_client().get("/rest/api/2/issue/GFD-1")

        assert result == {"key": "GFD-1"}
        mock_request.assert_called_once_with(
            "GET",
            "https://jira.test/rest/api/2/issue/GFD-1",
            params=None,
            json=None,
            auth=("user", "token"),
            headers={"Accept": "application/json"},
            timeout=30,
        )

    @patch("jira_utils.client.httpx.request")
    def test_post_with_json(self, mock_request):
        resp = MagicMock()
        resp.status_code = 201
        resp.is_success = True
        resp.json.return_value = {"id": "123"}
        mock_request.return_value = resp

        payload = {"fields": {"summary": "test"}}
        result = self._make_client().post("/rest/api/2/issue", json=payload)

        assert result == {"id": "123"}
        call_kwargs = mock_request.call_args[1]
        assert call_kwargs["json"] == payload

    @patch("jira_utils.client.httpx.request")
    def test_empty_body_returns_none(self, mock_request):
        resp = MagicMock()
        resp.status_code = 204
        resp.is_success = True
        resp.content = b""
        mock_request.return_value = resp

        result = self._make_client().post("/rest/agile/1.0/backlog/issue")
        assert result is None

    @patch("jira_utils.client.httpx.request")
    def test_201_empty_body_returns_none(self, mock_request):
        resp = MagicMock()
        resp.status_code = 201
        resp.is_success = True
        resp.content = b""
        mock_request.return_value = resp

        result = self._make_client().post("/rest/api/2/issueLink")
        assert result is None

    @patch("jira_utils.client.httpx.request")
    def test_error_raises(self, mock_request):
        resp = MagicMock()
        resp.status_code = 404
        resp.is_success = False
        resp.text = "Not Found"
        mock_request.return_value = resp

        with pytest.raises(JiraApiError) as exc_info:
            self._make_client().get("/rest/api/2/issue/NOPE-1")

        assert exc_info.value.status_code == 404
        assert "Not Found" in str(exc_info.value)

    @patch("jira_utils.client.httpx.request")
    def test_get_with_params(self, mock_request):
        resp = MagicMock()
        resp.status_code = 200
        resp.is_success = True
        resp.json.return_value = {"issues": []}
        mock_request.return_value = resp

        self._make_client().get("/rest/api/2/search", params={"jql": "x"})
        call_kwargs = mock_request.call_args[1]
        assert call_kwargs["params"] == {"jql": "x"}
