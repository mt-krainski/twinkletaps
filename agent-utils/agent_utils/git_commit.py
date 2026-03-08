"""Git commit with author/committer from git config."""

import os
import subprocess
from pathlib import Path

import typer


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


app = typer.Typer(invoke_without_command=True)


@app.callback()
def main(
    message: str = typer.Option(
        ...,
        "-m",
        "--message",
        help="Commit message. Use single quotes to avoid shell interpretation of "
        "backticks, $, <>, etc. Escape apostrophes as '\\''.",
    ),
) -> None:
    """Run git commit with author/committer from repo git config."""
    repo = Path.cwd()

    user_name = _git_config(repo, "user.name")
    if not user_name:
        typer.echo("git-commit: git config user.name is not set", err=True)
        raise typer.Exit(1)

    user_email = _git_config(repo, "user.email")
    if not user_email:
        typer.echo("git-commit: git config user.email is not set", err=True)
        raise typer.Exit(1)

    if not _has_staged_changes(repo):
        typer.echo(
            "git-commit: nothing staged; stage changes with git add",
            err=True,
        )
        raise typer.Exit(1)

    env = os.environ.copy()
    env["GIT_AUTHOR_NAME"] = user_name
    env["GIT_AUTHOR_EMAIL"] = user_email
    env["GIT_COMMITTER_NAME"] = user_name
    env["GIT_COMMITTER_EMAIL"] = user_email

    result = subprocess.run(
        ["git", "commit", "-m", message],
        cwd=repo,
        env=env,
    )
    raise typer.Exit(result.returncode)


if __name__ == "__main__":
    app()
