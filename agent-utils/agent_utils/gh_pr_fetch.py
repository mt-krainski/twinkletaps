"""Fetch all PR feedback (inline comments, reviews, conversation) via gh CLI."""

import json
import os
import subprocess

import typer

OWNER_ENV = "GITHUB_OWNER"
REPO_ENV = "GITHUB_REPO"

app = typer.Typer(invoke_without_command=True)


def run_gh_pr_fetch(
    pr_number: int,
    *,
    env: dict[str, str] | None = None,
) -> dict:
    """Fetch PR feedback from three GitHub endpoints; return combined dict.

    Args:
        pr_number: The pull request number.
        env: Optional env overrides (merged with os.environ).

    Returns:
        Dict with keys: inline_comments, reviews, conversation.

    Raises:
        ValueError: If GITHUB_OWNER or GITHUB_REPO is not set.
        RuntimeError: If any gh api call returns a non-zero exit code.
    """
    environ = {**os.environ} if env is None else {**os.environ, **env}
    owner = (environ.get(OWNER_ENV) or "").strip()
    repo = (environ.get(REPO_ENV) or "").strip()
    if not owner:
        raise ValueError(f"{OWNER_ENV} is not set")
    if not repo:
        raise ValueError(f"{REPO_ENV} is not set")

    repo_spec = f"{owner}/{repo}"

    def _api_get(path: str) -> list:
        result = subprocess.run(
            ["gh", "api", f"repos/{repo_spec}/{path}"],
            capture_output=True,
            text=True,
            env=environ,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"gh api failed for {path}: {result.stderr or result.stdout}"
            )
        return json.loads(result.stdout)

    inline = _api_get(f"pulls/{pr_number}/comments")
    reviews = _api_get(f"pulls/{pr_number}/reviews")
    conversation = _api_get(f"issues/{pr_number}/comments")

    return {
        "inline_comments": inline,
        "reviews": reviews,
        "conversation": conversation,
    }


@app.callback()
def main(
    pr_number: int = typer.Argument(..., help="PR number"),
) -> None:
    """Fetch all PR feedback and output as combined JSON."""
    try:
        result = run_gh_pr_fetch(pr_number)
    except ValueError as e:
        typer.echo(f"gh-pr-fetch: {e}", err=True)
        raise typer.Exit(1) from e
    except RuntimeError as e:
        typer.echo(str(e), err=True)
        raise typer.Exit(1) from e

    typer.echo(json.dumps(result, indent=2))


if __name__ == "__main__":
    app()
