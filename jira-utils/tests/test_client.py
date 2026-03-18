"""Tests for JiraClient."""

from unittest.mock import MagicMock, patch

import pytest

from jira_utils.client import JiraApiError, JiraClient, load_config


class TestLoadConfig:
    def test_returns_config_dict(self, monkeypatch):
        monkeypatch.setenv("JIRA_URL", "https://example.atlassian.net/")
        monkeypatch.setenv("JIRA_USERNAME", "user@example.com")
        monkeypatch.setenv("JIRA_API_TOKEN", "tok123")

        config = load_config()

        assert config == {
            "base_url": "https://example.atlassian.net",
            "username": "user@example.com",
            "api_token": "tok123",
        }

    def test_strips_trailing_slash(self, monkeypatch):
        monkeypatch.setenv("JIRA_URL", "https://x.atlassian.net///")
        monkeypatch.setenv("JIRA_USERNAME", "u")
        monkeypatch.setenv("JIRA_API_TOKEN", "t")

        config = load_config()

        assert config["base_url"] == "https://x.atlassian.net"

    @pytest.mark.parametrize("missing", ["JIRA_URL", "JIRA_USERNAME", "JIRA_API_TOKEN"])
    def test_raises_on_missing_var(self, missing, monkeypatch):
        monkeypatch.setenv("JIRA_URL", "https://x.atlassian.net")
        monkeypatch.setenv("JIRA_USERNAME", "u")
        monkeypatch.setenv("JIRA_API_TOKEN", "t")
        monkeypatch.delenv(missing)

        with pytest.raises(ValueError, match=missing):
            load_config()


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


class TestResolveAccountId:
    def _make_client(self):
        return JiraClient(
            base_url="https://jira.test",
            username="user",
            api_token="token",
        )

    @patch("jira_utils.client.httpx.request")
    def test_resolves_display_name(self, mock_request):
        resp = MagicMock()
        resp.status_code = 200
        resp.is_success = True
        resp.json.return_value = [
            {"accountId": "abc-123", "displayName": "Jane Doe", "active": True},
        ]
        resp.content = b"[...]"
        mock_request.return_value = resp

        result = self._make_client().resolve_account_id("Jane Doe")

        assert result == "abc-123"
        call_kwargs = mock_request.call_args[1]
        assert call_kwargs["params"] == {"query": "Jane Doe"}

    @patch("jira_utils.client.httpx.request")
    def test_raises_on_no_match(self, mock_request):
        resp = MagicMock()
        resp.status_code = 200
        resp.is_success = True
        resp.json.return_value = []
        resp.content = b"[]"
        mock_request.return_value = resp

        with pytest.raises(ValueError, match="No Jira user found"):
            self._make_client().resolve_account_id("Nobody")

    @patch("jira_utils.client.httpx.request")
    def test_returns_accountid_as_is(self, mock_request):
        """If input looks like an accountId (contains ':'), skip the lookup."""
        result = self._make_client().resolve_account_id("712020:f516654f-76e2")

        assert result == "712020:f516654f-76e2"
        mock_request.assert_not_called()
