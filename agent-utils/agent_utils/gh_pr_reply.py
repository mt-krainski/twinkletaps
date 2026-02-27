"""Post a reply to a GitHub PR conversation or inline review thread."""

import os
import subprocess

import typer

OWNER_ENV = "GITHUB_OWNER"
REPO_ENV = "GITHUB_REPO"

app = typer.Typer()


def run_gh_pr_reply(
    pr_number: int,
    body: str,
    comment_id: int | None = None,
    *,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    """Post a PR reply; return the CompletedProcess from gh.

    Without comment_id: posts a top-level conversation comment via the issues endpoint.
    With comment_id: replies in an inline review thread via the pulls endpoint.

    Args:
        pr_number: The pull request number.
        body: The comment body text.
        comment_id: ID of the inline comment to reply to (optional).
        env: Optional env overrides (merged with os.environ).

    Returns:
        CompletedProcess from the gh api call.

    Raises:
        ValueError: If GITHUB_OWNER or GITHUB_REPO is not set.
    """
    environ = {**os.environ} if env is None else {**os.environ, **env}
    owner = (environ.get(OWNER_ENV) or "").strip()
    repo = (environ.get(REPO_ENV) or "").strip()
    if not owner:
        raise ValueError(f"{OWNER_ENV} is not set")
    if not repo:
        raise ValueError(f"{REPO_ENV} is not set")

    if comment_id is not None:
        path = f"repos/{owner}/{repo}/pulls/{pr_number}/comments"
        cmd = [
            "gh",
            "api",
            "-X",
            "POST",
            path,
            "-f",
            f"body={body}",
            "-F",
            f"in_reply_to={comment_id}",
        ]
    else:
        path = f"repos/{owner}/{repo}/issues/{pr_number}/comments"
        cmd = [
            "gh",
            "api",
            "-X",
            "POST",
            path,
            "-f",
            f"body={body}",
        ]

    return subprocess.run(cmd, capture_output=True, text=True, env=environ)


@app.command()
def main(
    pr_number: int = typer.Argument(..., help="PR number"),
    body: str = typer.Option(..., "--body", help="Comment body"),
    comment_id: int | None = typer.Option(
        None, "--comment-id", help="Reply to this inline comment ID"
    ),
) -> None:
    """Post a PR comment or reply to an inline review thread."""
    try:
        result = run_gh_pr_reply(pr_number, body, comment_id)
    except ValueError as e:
        typer.echo(f"gh-pr-reply: {e}", err=True)
        raise typer.Exit(1) from e

    if result.returncode != 0:
        if result.stderr:
            typer.echo(result.stderr, err=True)
        raise typer.Exit(result.returncode)

    if result.stdout:
        typer.echo(result.stdout.strip())


if __name__ == "__main__":
    app()
