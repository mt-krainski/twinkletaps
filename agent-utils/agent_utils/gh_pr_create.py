"""Create a GitHub PR via gh CLI with owner/repo from env."""

import os
import subprocess

import typer

OWNER_ENV = "GITHUB_OWNER"
REPO_ENV = "GITHUB_REPO"

app = typer.Typer(invoke_without_command=True)


def run_gh_pr_create(
    base: str,
    title: str,
    body: str,
    *,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    """Run gh pr create; caller handles exit and output. Used for testing."""
    environ = {**os.environ} if env is None else {**os.environ, **env}
    owner = (environ.get(OWNER_ENV) or "").strip()
    repo = (environ.get(REPO_ENV) or "").strip()
    if not owner:
        raise ValueError(f"{OWNER_ENV} is not set")
    if not repo:
        raise ValueError(f"{REPO_ENV} is not set")
    repo_spec = f"{owner}/{repo}"
    return subprocess.run(
        [
            "gh",
            "pr",
            "create",
            "--repo",
            repo_spec,
            "--base",
            base,
            "--title",
            title,
            "--body",
            body,
        ],
        capture_output=True,
        text=True,
        env=environ,
    )


@app.callback()
def main(
    base: str = typer.Option(..., "--base", help="Base branch for the PR"),
    title: str = typer.Option(..., "--title", help="PR title"),
    body: str = typer.Option(..., "--body", help="PR body"),
) -> None:
    """Run gh pr create with repo from GITHUB_OWNER and GITHUB_REPO."""
    try:
        result = run_gh_pr_create(base, title, body)
    except ValueError as e:
        typer.echo(f"gh-pr-create: {e}", err=True)
        raise typer.Exit(1) from e

    if result.returncode != 0:
        if result.stderr:
            typer.echo(result.stderr, err=True)
        raise typer.Exit(result.returncode)

    if result.stdout:
        typer.echo(result.stdout.strip())


if __name__ == "__main__":
    app()
