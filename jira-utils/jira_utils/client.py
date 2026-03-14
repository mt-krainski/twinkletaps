"""Synchronous Jira HTTP client wrapping httpx."""

from __future__ import annotations

import os
from dataclasses import dataclass

import httpx


class JiraApiError(Exception):
    """Non-2xx response from Jira."""

    def __init__(self, status_code: int, body: str) -> None:
        self.status_code = status_code
        self.body = body
        super().__init__(f"Jira API {status_code}: {body}")


@dataclass
class JiraClient:
    """Thin wrapper around httpx for Jira REST calls."""

    base_url: str
    username: str
    api_token: str

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict | None = None,
        json: dict | list | None = None,
    ) -> dict | list | None:
        """Send an HTTP request and return parsed JSON (or None for 204)."""
        url = f"{self.base_url}{path}"
        response = httpx.request(
            method,
            url,
            params=params,
            json=json,
            auth=(self.username, self.api_token),
            headers={"Accept": "application/json"},
            timeout=30,
        )
        if not response.is_success:
            raise JiraApiError(response.status_code, response.text)
        if not response.content:
            return None
        return response.json()

    def get(self, path: str, params: dict | None = None) -> dict | list | None:
        """HTTP GET."""
        return self._request("GET", path, params=params)

    def post(self, path: str, json: dict | list | None = None) -> dict | list | None:
        """HTTP POST."""
        return self._request("POST", path, json=json)

    def put(self, path: str, json: dict | list | None = None) -> dict | list | None:
        """HTTP PUT."""
        return self._request("PUT", path, json=json)

    def resolve_account_id(self, name_or_id: str) -> str:
        """Resolve a display name to a Jira Cloud accountId.

        If the input already looks like an accountId (contains ':'),
        it is returned as-is without making an API call.
        """
        if ":" in name_or_id:
            return name_or_id

        results = self.get("/rest/api/2/user/search", params={"query": name_or_id})
        if not results:
            raise ValueError(f"No Jira user found matching '{name_or_id}'")
        return results[0]["accountId"]


def build_client() -> JiraClient:
    """Build a JiraClient from os.environ (loaded by dotenv at CLI startup)."""
    base_url = os.environ.get("JIRA_URL", "").rstrip("/")
    username = os.environ.get("JIRA_USERNAME", "")
    api_token = os.environ.get("JIRA_API_TOKEN", "")
    if not base_url:
        raise ValueError("JIRA_URL is not set")
    if not username:
        raise ValueError("JIRA_USERNAME is not set")
    if not api_token:
        raise ValueError("JIRA_API_TOKEN is not set")
    return JiraClient(base_url=base_url, username=username, api_token=api_token)
