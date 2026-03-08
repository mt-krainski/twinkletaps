"""Push current branch to origin with task-branch prefix validation."""

import os
import subprocess
from pathlib import Path

import typer

FORBIDDEN_BRANCHES = ("main", "master")
DEFAULT_PREFIX = "task/"


def _current_branch(repo: Path) -> str | None:
    result = subprocess.run(
        ["git", "symbolic-ref", "-q", "HEAD"],
        cwd=repo,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    ref = result.stdout.strip()
    if ref.startswith("refs/heads/"):
        return ref.removeprefix("refs/heads/")
    return None


app = typer.Typer(invoke_without_command=True)


@app.callback()
def main() -> None:
    """Push current branch to origin with -u.

    Refuses main/master, non-prefix branches, or detached HEAD.
    """
    repo = Path.cwd()
    prefix = os.environ.get("TASK_BRANCH_PREFIX", DEFAULT_PREFIX)

    branch = _current_branch(repo)
    if branch is None:
        typer.echo("git-push: detached HEAD; push only from a branch", err=True)
        raise typer.Exit(1)

    if branch in FORBIDDEN_BRANCHES:
        typer.echo(f"git-push: refusing to push '{branch}'", err=True)
        raise typer.Exit(1)

    if not branch.startswith(prefix):
        typer.echo(
            f"git-push: branch must start with {prefix!r}, got {branch!r}",
            err=True,
        )
        raise typer.Exit(1)

    result = subprocess.run(
        ["git", "push", "-u", "origin", branch],
        cwd=repo,
    )
    raise typer.Exit(result.returncode)


if __name__ == "__main__":
    app()
