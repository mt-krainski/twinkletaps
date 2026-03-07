"""Close a GitHub PR by number via gh CLI."""

import json
import os
import subprocess

import typer

OWNER_ENV = "GITHUB_OWNER"
REPO_ENV = "GITHUB_REPO"

app = typer.Typer(invoke_without_command=True)


def run_gh_pr_close(
    pr_number: str,
    *,
    comment: str | None = None,
    delete_branch: bool = False,
    env: dict[str, str] | None = None,
) -> dict:
    """Close a PR by number.

    Args:
        pr_number: PR number to close.
        comment: Optional comment to leave when closing.
        delete_branch: Whether to delete the head branch after closing.
        env: Optional env overrides (merged with os.environ).

    Returns:
        Dict with closed PR info from gh output.

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
        "close",
        pr_number,
        "--repo",
        repo_spec,
    ]

    if comment:
        cmd.extend(["--comment", comment])

    if delete_branch:
        cmd.append("--delete-branch")

    result = subprocess.run(cmd, capture_output=True, text=True, env=environ)
    if result.returncode != 0:
        raise RuntimeError(f"gh pr close failed: {result.stderr or result.stdout}")

    # gh pr close doesn't output JSON by default, return a status dict
    return {"pr": pr_number, "repo": repo_spec, "closed": True}


@app.callback()
def main(
    pr_number: str = typer.Argument(..., help="PR number to close"),
    comment: str = typer.Option(None, help="Comment to leave when closing"),
    delete_branch: bool = typer.Option(
        False, "--delete-branch", help="Delete the head branch after closing"
    ),
) -> None:
    """Close a GitHub PR by number."""
    try:
        result = run_gh_pr_close(
            pr_number, comment=comment, delete_branch=delete_branch
        )
    except ValueError as e:
        typer.echo(f"gh-pr-close: {e}", err=True)
        raise typer.Exit(1) from e
    except RuntimeError as e:
        typer.echo(str(e), err=True)
        raise typer.Exit(1) from e

    typer.echo(json.dumps(result, indent=2))


if __name__ == "__main__":
    app()
