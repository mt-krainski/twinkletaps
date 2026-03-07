"""Tests for gh_pr_close: close a PR by number."""

import subprocess
import sys
from unittest.mock import patch

import pytest

from agent_utils.gh_pr_close import run_gh_pr_close


def _run_cli(
    *args: str,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    import os

    run_env = {**os.environ} if env is None else {**os.environ, **env}
    return subprocess.run(
        [sys.executable, "-m", "agent_utils.gh_pr_close", *args],
        capture_output=True,
        text=True,
        env=run_env,
    )


def test_calls_gh_pr_close_with_pr_number() -> None:
    with patch("agent_utils.gh_pr_close.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        env = {"GITHUB_OWNER": "my-org", "GITHUB_REPO": "my-repo"}
        run_gh_pr_close("828", env=env)
        cmd = m.call_args[0][0]
        assert "gh" in cmd
        assert "pr" in cmd
        assert "close" in cmd
        assert "828" in cmd
        assert "my-org/my-repo" in " ".join(cmd)


def test_returns_closed_status() -> None:
    with patch("agent_utils.gh_pr_close.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        result = run_gh_pr_close("42", env=env)
        assert result["pr"] == "42"
        assert result["closed"] is True


def test_passes_comment_flag() -> None:
    with patch("agent_utils.gh_pr_close.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        run_gh_pr_close("1", comment="Closing as invalid", env=env)
        cmd = m.call_args[0][0]
        assert "--comment" in cmd
        comment_idx = cmd.index("--comment")
        assert cmd[comment_idx + 1] == "Closing as invalid"


def test_passes_delete_branch_flag() -> None:
    with patch("agent_utils.gh_pr_close.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        run_gh_pr_close("1", delete_branch=True, env=env)
        cmd = m.call_args[0][0]
        assert "--delete-branch" in cmd


def test_no_delete_branch_by_default() -> None:
    with patch("agent_utils.gh_pr_close.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        run_gh_pr_close("1", env=env)
        cmd = m.call_args[0][0]
        assert "--delete-branch" not in cmd


def test_fails_with_clear_error_when_github_owner_not_set() -> None:
    result = _run_cli("1", env={"GITHUB_OWNER": "", "GITHUB_REPO": "repo"})
    assert result.returncode != 0
    assert "GITHUB_OWNER" in (result.stderr + result.stdout)


def test_fails_with_clear_error_when_github_repo_not_set() -> None:
    result = _run_cli("1", env={"GITHUB_OWNER": "owner", "GITHUB_REPO": ""})
    assert result.returncode != 0
    assert "GITHUB_REPO" in (result.stderr + result.stdout)


def test_propagates_nonzero_exit_from_gh() -> None:
    with patch("agent_utils.gh_pr_close.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 1, "", "no PR found")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        with pytest.raises(RuntimeError, match="no PR found"):
            run_gh_pr_close("99", env=env)
