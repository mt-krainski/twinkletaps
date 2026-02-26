"""Tests for gh_pr_reply: post top-level or inline PR comments."""

import subprocess
import sys
from unittest.mock import patch

from agent_utils.gh_pr_reply import run_gh_pr_reply


def _run_cli(
    *args: str,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    import os

    run_env = {**os.environ} if env is None else {**os.environ, **env}
    return subprocess.run(
        [sys.executable, "-m", "agent_utils.gh_pr_reply", *args],
        capture_output=True,
        text=True,
        env=run_env,
    )


def test_without_comment_id_posts_to_issues_endpoint() -> None:
    with patch("agent_utils.gh_pr_reply.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        run_gh_pr_reply(42, "hello", env={"GITHUB_OWNER": "o", "GITHUB_REPO": "r"})
        cmd = " ".join(m.call_args[0][0])
        assert "issues/42/comments" in cmd
        assert "pulls" not in cmd


def test_with_comment_id_posts_to_pulls_endpoint() -> None:
    with patch("agent_utils.gh_pr_reply.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        run_gh_pr_reply(
            42, "reply", comment_id=99, env={"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        )
        cmd = " ".join(m.call_args[0][0])
        assert "pulls/42/comments" in cmd
        assert "issues" not in cmd


def test_with_comment_id_includes_in_reply_to_field() -> None:
    with patch("agent_utils.gh_pr_reply.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        run_gh_pr_reply(
            10, "reply", comment_id=555, env={"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        )
        cmd = m.call_args[0][0]
        # -F in_reply_to=555 should appear in the command
        assert any("in_reply_to" in arg and "555" in arg for arg in cmd)


def test_body_is_sent_in_request_command() -> None:
    with patch("agent_utils.gh_pr_reply.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        run_gh_pr_reply(
            1, "my comment body", env={"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        )
        cmd = " ".join(m.call_args[0][0])
        assert "my comment body" in cmd


def test_fails_with_clear_error_when_github_owner_not_set() -> None:
    result = _run_cli(
        "--pr", "1", "--body", "msg", env={"GITHUB_OWNER": "", "GITHUB_REPO": "repo"}
    )
    assert result.returncode != 0
    assert "GITHUB_OWNER" in (result.stderr + result.stdout)


def test_fails_with_clear_error_when_github_repo_not_set() -> None:
    result = _run_cli(
        "--pr", "1", "--body", "msg", env={"GITHUB_OWNER": "owner", "GITHUB_REPO": ""}
    )
    assert result.returncode != 0
    assert "GITHUB_REPO" in (result.stderr + result.stdout)


def test_propagates_nonzero_exit_and_stderr_from_gh() -> None:
    with patch("agent_utils.gh_pr_reply.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess(
            [], 1, "", "gh: authentication required"
        )
        result = run_gh_pr_reply(
            1, "msg", env={"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        )
        assert result.returncode == 1
        assert "authentication required" in result.stderr
