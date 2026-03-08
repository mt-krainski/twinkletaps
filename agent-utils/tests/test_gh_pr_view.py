"""Tests for gh_pr_view: view a PR by number or branch name."""

import subprocess
import sys
from unittest.mock import patch

import pytest

from agent_utils.gh_pr_view import run_gh_pr_view


def _run_cli(
    *args: str,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    import os

    run_env = {**os.environ} if env is None else {**os.environ, **env}
    return subprocess.run(
        [sys.executable, "-m", "agent_utils.gh_pr_view", *args],
        capture_output=True,
        text=True,
        env=run_env,
    )


def test_calls_gh_pr_view_with_pr_number() -> None:
    json_out = '{"number": 42, "title": "My PR"}'
    with patch("agent_utils.gh_pr_view.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, json_out, "")
        env = {"GITHUB_OWNER": "my-org", "GITHUB_REPO": "my-repo"}
        run_gh_pr_view("42", env=env)
        cmd = m.call_args[0][0]
        assert "gh" in cmd
        assert "pr" in cmd
        assert "view" in cmd
        assert "42" in cmd
        assert "my-org/my-repo" in " ".join(cmd)


def test_calls_gh_pr_view_with_branch_name() -> None:
    json_out = '{"number": 7, "title": "Branch PR"}'
    with patch("agent_utils.gh_pr_view.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, json_out, "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        run_gh_pr_view("task/GFD-29/workspace-routing", env=env)
        cmd = m.call_args[0][0]
        assert "task/GFD-29/workspace-routing" in cmd


def test_returns_parsed_json() -> None:
    json_out = '{"number": 42, "title": "My PR", "url": "https://example.com"}'
    with patch("agent_utils.gh_pr_view.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, json_out, "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        result = run_gh_pr_view("42", env=env)
        assert result["number"] == 42
        assert result["title"] == "My PR"


def test_passes_custom_fields() -> None:
    json_out = '{"number": 1}'
    with patch("agent_utils.gh_pr_view.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, json_out, "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        run_gh_pr_view("1", fields="number,title,url", env=env)
        cmd = m.call_args[0][0]
        assert "--json" in cmd
        json_idx = cmd.index("--json")
        assert cmd[json_idx + 1] == "number,title,url"


def test_default_fields() -> None:
    json_out = '{"number": 1}'
    with patch("agent_utils.gh_pr_view.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, json_out, "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        run_gh_pr_view("1", env=env)
        cmd = m.call_args[0][0]
        assert "--json" in cmd
        json_idx = cmd.index("--json")
        fields = cmd[json_idx + 1]
        assert "number" in fields
        assert "title" in fields
        assert "url" in fields


def test_fails_with_clear_error_when_github_owner_not_set() -> None:
    result = _run_cli("1", env={"GITHUB_OWNER": "", "GITHUB_REPO": "repo"})
    assert result.returncode != 0
    assert "GITHUB_OWNER" in (result.stderr + result.stdout)


def test_fails_with_clear_error_when_github_repo_not_set() -> None:
    result = _run_cli("1", env={"GITHUB_OWNER": "owner", "GITHUB_REPO": ""})
    assert result.returncode != 0
    assert "GITHUB_REPO" in (result.stderr + result.stdout)


def test_propagates_nonzero_exit_from_gh() -> None:
    with patch("agent_utils.gh_pr_view.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 1, "", "no PR found")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        with pytest.raises(RuntimeError, match="no PR found"):
            run_gh_pr_view("99", env=env)
