"""Tests for git_commit: commit with identity from git config."""

import os
import subprocess
import sys
from pathlib import Path


def _run_git(repo: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=repo,
        capture_output=True,
        text=True,
    )


def _run_git_commit(
    repo: Path,
    *args: str,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess:
    run_env = {**os.environ} if env is None else {**os.environ, **env}
    return subprocess.run(
        [sys.executable, "-m", "agent_utils.git_commit", *args],
        cwd=repo,
        env=run_env,
        capture_output=True,
        text=True,
    )


def test_commit_succeeds_and_uses_identity_from_config(tmp_path: Path) -> None:
    _run_git(tmp_path, "init")
    _run_git(tmp_path, "config", "user.name", "Test User")
    _run_git(tmp_path, "config", "user.email", "test@example.com")
    (tmp_path / "f").write_text("x")
    _run_git(tmp_path, "add", "f")
    result = _run_git_commit(tmp_path, "-m", "hello")
    assert result.returncode == 0, result.stderr or result.stdout
    log = _run_git(tmp_path, "log", "-1", "--format=%an%n%ae%n%s")
    assert log.stdout.strip() == "Test User\ntest@example.com\nhello"


def test_commit_message_appears_correctly_single_line(tmp_path: Path) -> None:
    _run_git(tmp_path, "init")
    _run_git(tmp_path, "config", "user.name", "A")
    _run_git(tmp_path, "config", "user.email", "a@b.co")
    (tmp_path / "f").write_text("x")
    _run_git(tmp_path, "add", "f")
    _run_git_commit(tmp_path, "-m", "single line subject")
    log = _run_git(tmp_path, "log", "-1", "--format=%s")
    assert log.stdout.strip() == "single line subject"


def test_commit_message_appears_correctly_multiline(tmp_path: Path) -> None:
    _run_git(tmp_path, "init")
    _run_git(tmp_path, "config", "user.name", "A")
    _run_git(tmp_path, "config", "user.email", "a@b.co")
    (tmp_path / "f").write_text("x")
    _run_git(tmp_path, "add", "f")
    _run_git_commit(tmp_path, "-m", "Title\n\nBody paragraph.")
    log = _run_git(tmp_path, "log", "-1", "--format=%B")
    assert log.stdout.strip() == "Title\n\nBody paragraph."


def test_fails_with_clear_error_when_user_name_not_configured(tmp_path: Path) -> None:
    _run_git(tmp_path, "init")
    _run_git(tmp_path, "config", "user.email", "test@example.com")
    (tmp_path / "f").write_text("x")
    _run_git(tmp_path, "add", "f")
    env_no_global = {"HOME": str(tmp_path)}
    result = _run_git_commit(tmp_path, "-m", "msg", env=env_no_global)
    assert result.returncode != 0
    assert "user.name" in (result.stderr + result.stdout).lower()


def test_fails_with_clear_error_when_user_email_not_configured(tmp_path: Path) -> None:
    _run_git(tmp_path, "init")
    _run_git(tmp_path, "config", "user.name", "Test")
    (tmp_path / "f").write_text("x")
    _run_git(tmp_path, "add", "f")
    env_no_global = {"HOME": str(tmp_path)}
    result = _run_git_commit(tmp_path, "-m", "msg", env=env_no_global)
    assert result.returncode != 0
    assert "user.email" in (result.stderr + result.stdout).lower()


def test_fails_when_nothing_staged(tmp_path: Path) -> None:
    _run_git(tmp_path, "init")
    _run_git(tmp_path, "config", "user.name", "Test")
    _run_git(tmp_path, "config", "user.email", "test@example.com")
    (tmp_path / "f").write_text("x")
    result = _run_git_commit(tmp_path, "-m", "msg")
    assert result.returncode != 0
    assert "staged" in (result.stderr + result.stdout).lower()
