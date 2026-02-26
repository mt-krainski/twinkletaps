"""Tests for gh_pr_checks: CI check statuses with failed run logs."""

import subprocess
import sys
from unittest.mock import patch

from agent_utils.gh_pr_checks import run_gh_pr_checks


def _run_cli(
    *args: str,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    import os

    run_env = {**os.environ} if env is None else {**os.environ, **env}
    return subprocess.run(
        [sys.executable, "-m", "agent_utils.gh_pr_checks", *args],
        capture_output=True,
        text=True,
        env=run_env,
    )


def test_calls_gh_pr_checks_with_correct_repo_and_number() -> None:
    with patch("agent_utils.gh_pr_checks.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        run_gh_pr_checks(42, env={"GITHUB_OWNER": "my-org", "GITHUB_REPO": "my-repo"})
        cmd = " ".join(m.call_args[0][0])
        assert "gh" in cmd
        assert "pr" in cmd
        assert "checks" in cmd
        assert "42" in cmd
        assert "my-org/my-repo" in cmd


def test_returns_check_output_when_all_pass() -> None:
    checks_output = "lint  pass  10s  https://github.com/o/r/actions/runs/1/jobs/2\n"
    with patch("agent_utils.gh_pr_checks.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, checks_output, "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        code, output = run_gh_pr_checks(1, env=env)
        assert code == 0
        assert checks_output in output
        assert m.call_count == 1  # only the checks call, no log fetching


def test_fetches_failed_run_logs_when_check_fails() -> None:
    # Line with "fail" and a URL containing the run ID
    checks_output = (
        "build  fail  2m0s  "
        "https://github.com/owner/repo/actions/runs/99999/jobs/11111\n"
    )
    log_output = "Error: build step failed\n"
    with patch("agent_utils.gh_pr_checks.subprocess.run") as m:
        m.side_effect = [
            subprocess.CompletedProcess([], 0, checks_output, ""),
            subprocess.CompletedProcess([], 0, log_output, ""),
        ]
        run_gh_pr_checks(1, env={"GITHUB_OWNER": "owner", "GITHUB_REPO": "repo"})
        assert m.call_count == 2
        second_cmd = " ".join(m.call_args_list[1][0][0])
        assert "run" in second_cmd
        assert "view" in second_cmd
        assert "99999" in second_cmd
        assert "log-failed" in second_cmd


def test_handles_empty_output_gracefully() -> None:
    # When gh pr checks returns no output (no checks on this PR)
    with patch("agent_utils.gh_pr_checks.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "", "")
        env = {"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        code, output = run_gh_pr_checks(1, env=env)
        assert code == 0
        assert output == ""
        assert m.call_count == 1  # no failed runs to fetch


def test_fails_with_clear_error_when_github_owner_not_set() -> None:
    result = _run_cli("--pr", "1", env={"GITHUB_OWNER": "", "GITHUB_REPO": "repo"})
    assert result.returncode != 0
    assert "GITHUB_OWNER" in (result.stderr + result.stdout)


def test_fails_with_clear_error_when_github_repo_not_set() -> None:
    result = _run_cli("--pr", "1", env={"GITHUB_OWNER": "owner", "GITHUB_REPO": ""})
    assert result.returncode != 0
    assert "GITHUB_REPO" in (result.stderr + result.stdout)


def test_propagates_nonzero_exit_when_gh_pr_checks_fails() -> None:
    with patch("agent_utils.gh_pr_checks.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 1, "", "gh: not found")
        code, output = run_gh_pr_checks(
            1, env={"GITHUB_OWNER": "o", "GITHUB_REPO": "r"}
        )
        assert code == 1
