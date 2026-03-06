"""View a single PR by number or branch name via gh CLI."""

import json
import os
import subprocess

import typer

OWNER_ENV = "GITHUB_OWNER"
REPO_ENV = "GITHUB_REPO"

DEFAULT_FIELDS = "number,title,url,headRefName,state,statusCheckRollup"

app = typer.Typer(invoke_without_command=True)


def run_gh_pr_view(
    ref: str,
    *,
    fields: str | None = None,
    env: dict[str, str] | None = None,
) -> dict:
    """View a PR by number or branch name.

    Args:
        ref: PR number or branch name.
        fields: Comma-separated list of JSON fields (default: common fields).
        env: Optional env overrides (merged with os.environ).

    Returns:
        Dict of PR data from gh output.

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
        "view",
        ref,
        "--repo",
        repo_spec,
        "--json",
        fields or DEFAULT_FIELDS,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, env=environ)
    if result.returncode != 0:
        raise RuntimeError(f"gh pr view failed: {result.stderr or result.stdout}")

    return json.loads(result.stdout)


@app.callback()
def main(
    ref: str = typer.Argument(..., help="PR number or branch name"),
    fields: str = typer.Option(None, help="Comma-separated JSON fields to fetch"),
) -> None:
    """View a PR by number or branch name."""
    try:
        result = run_gh_pr_view(ref, fields=fields)
    except ValueError as e:
        typer.echo(f"gh-pr-view: {e}", err=True)
        raise typer.Exit(1) from e
    except RuntimeError as e:
        typer.echo(str(e), err=True)
        raise typer.Exit(1) from e

    typer.echo(json.dumps(result, indent=2))


if __name__ == "__main__":
    app()
