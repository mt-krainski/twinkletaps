"""Tests for git_push: push to origin with branch prefix validation."""

import os
import subprocess
import sys
from pathlib import Path

import typer


def _run_git(repo: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=repo,
        capture_output=True,
        text=True,
    )


def _run_git_push(
    repo: Path,
    *args: str,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess:
    run_env = {**os.environ} if env is None else {**os.environ, **env}
    return subprocess.run(
        [sys.executable, "-m", "agent_utils.git_push", *args],
        cwd=repo,
        env=run_env,
        capture_output=True,
        text=True,
    )


def test_push_succeeds_on_task_branch_with_prefix(tmp_path: Path) -> None:
    bare = tmp_path / "bare"
    bare.mkdir()
    _run_git(bare, "init", "--bare")
    repo = tmp_path / "repo"
    repo.mkdir()
    _run_git(repo, "init")
    _run_git(repo, "remote", "add", "origin", str(bare))
    _run_git(repo, "checkout", "-b", "task/T-123/my-slug")
    (repo / "f").write_text("x")
    _run_git(repo, "add", "f")
    _run_git(repo, "commit", "-m", "initial")
    result = _run_git_push(repo, env={"TASK_BRANCH_PREFIX": "task/"})
    assert result.returncode == 0, result.stderr or result.stdout
    refs = _run_git(bare, "branch", "-a")
    assert "task/T-123/my-slug" in refs.stdout or "my-slug" in refs.stdout


def test_refuses_push_on_main(tmp_path: Path) -> None:
    _run_git(tmp_path, "init")
    _run_git(tmp_path, "checkout", "-b", "main")
    result = _run_git_push(tmp_path, env={"TASK_BRANCH_PREFIX": "task/"})
    assert result.returncode != 0
    assert "main" in (result.stderr + result.stdout).lower()


def test_refuses_push_on_master(tmp_path: Path) -> None:
    _run_git(tmp_path, "init")
    _run_git(tmp_path, "branch", "-m", "master")
    result = _run_git_push(tmp_path, env={"TASK_BRANCH_PREFIX": "task/"})
    assert result.returncode != 0
    assert "master" in (result.stderr + result.stdout).lower()


def test_refuses_push_when_branch_has_no_prefix(tmp_path: Path) -> None:
    _run_git(tmp_path, "init")
    _run_git(tmp_path, "checkout", "-b", "feature/something")
    (tmp_path / "f").write_text("x")
    _run_git(tmp_path, "add", "f")
    _run_git(tmp_path, "commit", "-m", "x")
    result = _run_git_push(tmp_path, env={"TASK_BRANCH_PREFIX": "task/"})
    assert result.returncode != 0
    assert (
        "task" in (result.stderr + result.stdout).lower()
        or "prefix" in (result.stderr + result.stdout).lower()
    )


def test_refuses_when_detached_head(tmp_path: Path) -> None:
    _run_git(tmp_path, "init")
    (tmp_path / "f").write_text("x")
    _run_git(tmp_path, "add", "f")
    _run_git(tmp_path, "commit", "-m", "x")
    _run_git(tmp_path, "checkout", "HEAD~0")
    _run_git(tmp_path, "checkout", "--detach", "HEAD")
    result = _run_git_push(tmp_path, env={"TASK_BRANCH_PREFIX": "task/"})
    assert result.returncode != 0
    assert (
        "detach" in (result.stderr + result.stdout).lower()
        or "head" in (result.stderr + result.stdout).lower()
    )


def test_uses_verbatim_branch_name_in_push_command(tmp_path: Path) -> None:
    calls: list[list[str]] = []
    branch_name = "task/GFD-13/git-push-wrapper"

    def capture_run(cmd, *args, **kwargs):
        calls.append(cmd)
        if cmd[:2] == ["git", "symbolic-ref"]:
            return subprocess.CompletedProcess(
                cmd, 0, f"refs/heads/{branch_name}\n", ""
            )
        if cmd[:2] == ["git", "push"]:
            return subprocess.CompletedProcess(cmd, 0, "", "")
        return subprocess.CompletedProcess(cmd, 0, "", "")

    _run_git(tmp_path, "init")
    _run_git(tmp_path, "checkout", "-b", branch_name)
    (tmp_path / "f").write_text("x")
    _run_git(tmp_path, "add", "f")
    _run_git(tmp_path, "commit", "-m", "x")
    import agent_utils.git_push as gp

    orig_run = subprocess.run
    orig_cwd = os.getcwd()
    try:
        os.chdir(tmp_path)
        subprocess.run = capture_run
        try:
            gp.main()
        except typer.Exit:
            pass
    finally:
        subprocess.run = orig_run
        os.chdir(orig_cwd)
    push_calls = [c for c in calls if c[:2] == ["git", "push"]]
    assert len(push_calls) == 1
    push_args = push_calls[0]
    assert push_args[-1] == branch_name
    assert "HEAD" not in push_args
