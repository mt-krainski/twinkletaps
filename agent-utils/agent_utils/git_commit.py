"""Git commit with author/committer from git config."""

import argparse
import os
import subprocess
import sys
from pathlib import Path


def _git_config(repo: Path, key: str) -> str | None:
    result = subprocess.run(
        ["git", "config", "--get", key],
        cwd=repo,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip() or None


def _has_staged_changes(repo: Path) -> bool:
    result = subprocess.run(
        ["git", "diff", "--cached", "--quiet"],
        cwd=repo,
        capture_output=True,
    )
    return result.returncode != 0


def main(repo: Path | None = None, argv: list[str] | None = None) -> int:
    """Run git commit with author/committer from repo git config. Returns exit code."""
    repo = repo or Path.cwd()
    parser = argparse.ArgumentParser(description="Commit with identity from git config")
    parser.add_argument("-m", "--message", required=True, help="Commit message")
    args = parser.parse_args(argv)

    user_name = _git_config(repo, "user.name")
    if not user_name:
        print("git-commit: git config user.name is not set", file=sys.stderr)
        return 1

    user_email = _git_config(repo, "user.email")
    if not user_email:
        print("git-commit: git config user.email is not set", file=sys.stderr)
        return 1

    if not _has_staged_changes(repo):
        print("git-commit: nothing staged; stage changes with git add", file=sys.stderr)
        return 1

    env = os.environ.copy()
    env["GIT_AUTHOR_NAME"] = user_name
    env["GIT_AUTHOR_EMAIL"] = user_email
    env["GIT_COMMITTER_NAME"] = user_name
    env["GIT_COMMITTER_EMAIL"] = user_email

    result = subprocess.run(
        ["git", "commit", "-m", args.message],
        cwd=repo,
        env=env,
    )
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
