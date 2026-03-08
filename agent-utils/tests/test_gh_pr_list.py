"""Tests for gh_pr_list: list PRs for the repo."""

import subprocess
import sys
from unittest.mock import patch

import pytest

from agent_utils.gh_pr_list import run_gh_pr_list


def _run_cli(
    *args: str,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    import os

    run_env = {**os.environ} if env is None else {**os.environ, **env}
    return subprocess.run(
        [sys.executable, "-m", "agent_utils.gh_pr_list", *args],
        capture_output=True,
        text=True,
        env=run_env,
    )


def test_calls_gh_pr_list_with_correct_repo() -> None:
    with patch("agent_utils.gh_pr_list.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "[]", "")
        run_gh_pr_list(env={"GITHUB_OWNER": "my-org", "GITHUB_REPO": "my-repo"})
        cmd = m.call_args[0][0]
        assert "gh" in cmd
        assert "pr" in cmd
        assert "list" in cmd
        assert "my-org/my-repo" in " ".join(cmd)


def test_passes_head_branch_filter() -> None:
    with patch("agent_utils.gh_pr_list.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "[]", "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        run_gh_pr_list(head="task/GFD-29/foo", env=env)
        cmd = m.call_args[0][0]
        assert "--head" in cmd
        head_idx = cmd.index("--head")
        assert cmd[head_idx + 1] == "task/GFD-29/foo"


def test_returns_parsed_json_output() -> None:
    json_output = '[{"number": 42, "title": "My PR"}]'
    with patch("agent_utils.gh_pr_list.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, json_output, "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        result = run_gh_pr_list(env=env)
        assert result == [{"number": 42, "title": "My PR"}]


def test_returns_empty_list_when_no_prs() -> None:
    with patch("agent_utils.gh_pr_list.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "[]", "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        result = run_gh_pr_list(env=env)
        assert result == []


def test_fails_with_clear_error_when_github_owner_not_set() -> None:
    result = _run_cli(env={"GITHUB_OWNER": "", "GITHUB_REPO": "repo"})
    assert result.returncode != 0
    assert "GITHUB_OWNER" in (result.stderr + result.stdout)


def test_fails_with_clear_error_when_github_repo_not_set() -> None:
    result = _run_cli(env={"GITHUB_OWNER": "owner", "GITHUB_REPO": ""})
    assert result.returncode != 0
    assert "GITHUB_REPO" in (result.stderr + result.stdout)


def test_propagates_nonzero_exit_from_gh() -> None:
    with patch("agent_utils.gh_pr_list.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 1, "", "gh: error")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        with pytest.raises(RuntimeError, match="gh: error"):
            run_gh_pr_list(env=env)
