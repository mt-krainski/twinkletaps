"""Tests for gh_pr_create: wrapper around gh pr create."""

import subprocess
import sys
from unittest.mock import patch

from agent_utils.gh_pr_create import run_gh_pr_create


def _run_cli(
    *args: str,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    import os

    run_env = {**os.environ} if env is None else {**os.environ, **env}
    return subprocess.run(
        [sys.executable, "-m", "agent_utils.gh_pr_create", *args],
        capture_output=True,
        text=True,
        env=run_env,
    )


def test_constructs_correct_gh_pr_create_command() -> None:
    with patch("agent_utils.gh_pr_create.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess(
            [],
            returncode=0,
            stdout="https://github.com/owner/repo/pull/42\n",
            stderr="",
        )
        env = {"GITHUB_OWNER": "my-org", "GITHUB_REPO": "my-repo"}
        run_gh_pr_create("main", "Fix bug", "Description", env=env)
        m.assert_called_once()
        call_args = m.call_args[0][0]
        assert call_args == [
            "gh",
            "pr",
            "create",
            "--repo",
            "my-org/my-repo",
            "--base",
            "main",
            "--title",
            "Fix bug",
            "--body",
            "Description",
        ]


def test_returns_pr_url_from_stdout() -> None:
    url = "https://github.com/owner/repo/pull/42"
    with patch("agent_utils.gh_pr_create.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess(
            [],
            returncode=0,
            stdout=url + "\n",
            stderr="",
        )
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        result = run_gh_pr_create("b", "t", "body", env=env)
        assert result.returncode == 0
        assert result.stdout.strip() == url


def test_fails_with_clear_error_when_github_owner_not_set() -> None:
    # Empty string so _get_env returns None (env is merged with os.environ).
    result = _run_cli(
        "--base",
        "main",
        "--title",
        "t",
        "--body",
        "b",
        env={"GITHUB_OWNER": "", "GITHUB_REPO": "repo"},
    )
    assert result.returncode != 0
    assert "GITHUB_OWNER" in (result.stderr + result.stdout)


def test_fails_with_clear_error_when_github_repo_not_set() -> None:
    result = _run_cli(
        "--base",
        "main",
        "--title",
        "t",
        "--body",
        "b",
        env={"GITHUB_OWNER": "owner", "GITHUB_REPO": ""},
    )
    assert result.returncode != 0
    assert "GITHUB_REPO" in (result.stderr + result.stdout)


def test_propagates_nonzero_exit_and_stderr_from_gh() -> None:
    with patch("agent_utils.gh_pr_create.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess(
            [],
            returncode=1,
            stdout="",
            stderr="gh: something failed",
        )
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        result = run_gh_pr_create("b", "t", "body", env=env)
        assert result.returncode == 1
        assert "something failed" in result.stderr
