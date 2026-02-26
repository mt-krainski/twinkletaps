"""Tests for gh_pr_fetch: fetch all PR feedback into combined JSON."""

import json
import subprocess
import sys
from unittest.mock import patch

from agent_utils.gh_pr_fetch import run_gh_pr_fetch


def _run_cli(
    *args: str,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    import os

    run_env = {**os.environ} if env is None else {**os.environ, **env}
    return subprocess.run(
        [sys.executable, "-m", "agent_utils.gh_pr_fetch", *args],
        capture_output=True,
        text=True,
        env=run_env,
    )


def test_calls_all_three_endpoints() -> None:
    # inline comments, reviews, conversation — three separate gh api calls
    with patch("agent_utils.gh_pr_fetch.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "[]", "")
        run_gh_pr_fetch(42, env={"GITHUB_OWNER": "owner", "GITHUB_REPO": "repo"})
        assert m.call_count == 3


def test_uses_github_owner_repo_from_env_in_urls() -> None:
    with patch("agent_utils.gh_pr_fetch.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "[]", "")
        run_gh_pr_fetch(99, env={"GITHUB_OWNER": "my-org", "GITHUB_REPO": "my-repo"})
        all_cmds = [" ".join(c[0][0]) for c in m.call_args_list]
        assert all("repos/my-org/my-repo" in cmd for cmd in all_cmds)


def test_pr_number_appears_in_all_urls() -> None:
    with patch("agent_utils.gh_pr_fetch.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "[]", "")
        run_gh_pr_fetch(77, env={"GITHUB_OWNER": "o", "GITHUB_REPO": "r"})
        all_cmds = [" ".join(c[0][0]) for c in m.call_args_list]
        assert all("77" in cmd for cmd in all_cmds)


def test_returns_combined_dict_with_all_three_keys() -> None:
    with patch("agent_utils.gh_pr_fetch.subprocess.run") as m:
        m.return_value = subprocess.CompletedProcess([], 0, "[]", "")
        result = run_gh_pr_fetch(1, env={"GITHUB_OWNER": "o", "GITHUB_REPO": "r"})
        assert set(result.keys()) == {"inline_comments", "reviews", "conversation"}


def test_returns_data_from_each_endpoint() -> None:
    inline = [{"id": 1, "body": "inline"}]
    reviews = [{"id": 2, "body": "review"}]
    conversation = [{"id": 3, "body": "convo"}]
    with patch("agent_utils.gh_pr_fetch.subprocess.run") as m:
        m.side_effect = [
            subprocess.CompletedProcess([], 0, json.dumps(inline), ""),
            subprocess.CompletedProcess([], 0, json.dumps(reviews), ""),
            subprocess.CompletedProcess([], 0, json.dumps(conversation), ""),
        ]
        result = run_gh_pr_fetch(5, env={"GITHUB_OWNER": "o", "GITHUB_REPO": "r"})
        assert result["inline_comments"] == inline
        assert result["reviews"] == reviews
        assert result["conversation"] == conversation


def test_fails_with_clear_error_when_github_owner_not_set() -> None:
    result = _run_cli("--pr", "1", env={"GITHUB_OWNER": "", "GITHUB_REPO": "repo"})
    assert result.returncode != 0
    assert "GITHUB_OWNER" in (result.stderr + result.stdout)


def test_fails_with_clear_error_when_github_repo_not_set() -> None:
    result = _run_cli("--pr", "1", env={"GITHUB_OWNER": "owner", "GITHUB_REPO": ""})
    assert result.returncode != 0
    assert "GITHUB_REPO" in (result.stderr + result.stdout)
