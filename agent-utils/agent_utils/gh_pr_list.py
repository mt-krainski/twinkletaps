"""List pull requests for the repo via gh CLI."""

import json
import os
import subprocess

import typer

OWNER_ENV = "GITHUB_OWNER"
REPO_ENV = "GITHUB_REPO"

app = typer.Typer(invoke_without_command=True)


def run_gh_pr_list(
    *,
    head: str | None = None,
    env: dict[str, str] | None = None,
) -> list[dict]:
    """List PRs, optionally filtered by head branch.

    Args:
        head: Filter by head branch name.
        env: Optional env overrides (merged with os.environ).

    Returns:
        List of PR dicts from gh output.

    Raises:
        ValueError: If GITHUB_OWNER or GITHUB_REPO is not set.
        RuntimeError: If gh returns a non-zero exit code.
    """
    environ = {**os.environ} if env is None else {**os.environ, **env}
    owner = (environ.get(OWNER_ENV) or "").strip()
    repo = (environ.get(REPO_ENV) or "").strip()
    if not owner:
        raise ValueError(f"{OWNER_ENV} is not set")
    if not repo:
        raise ValueError(f"{REPO_ENV} is not set")

    repo_spec = f"{owner}/{repo}"
    cmd = [
        "gh",
        "pr",
        "list",
        "--repo",
        repo_spec,
        "--json",
        "number,title,url,headRefName,state",
    ]

    if head:
        cmd.extend(["--head", head])

    result = subprocess.run(cmd, capture_output=True, text=True, env=environ)
    if result.returncode != 0:
        raise RuntimeError(f"gh pr list failed: {result.stderr or result.stdout}")

    return json.loads(result.stdout)


@app.callback()
def main(
    head: str = typer.Option(None, help="Filter by head branch name"),
) -> None:
    """List pull requests for the repo."""
    try:
        result = run_gh_pr_list(head=head)
    except ValueError as e:
        typer.echo(f"gh-pr-list: {e}", err=True)
        raise typer.Exit(1) from e
    except RuntimeError as e:
        typer.echo(str(e), err=True)
        raise typer.Exit(1) from e

    typer.echo(json.dumps(result, indent=2))


if __name__ == "__main__":
    app()
