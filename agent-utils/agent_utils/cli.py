"""Unified CLI entry point for agent-utils."""

import typer
from dotenv import load_dotenv

from agent_utils.gh_pr_checks import app as gh_pr_checks_app
from agent_utils.gh_pr_create import app as gh_pr_create_app
from agent_utils.gh_pr_fetch import app as gh_pr_fetch_app
from agent_utils.gh_pr_reply import app as gh_pr_reply_app
from agent_utils.git_commit import app as git_commit_app
from agent_utils.git_push import app as git_push_app

app = typer.Typer(help="Agent utilities for git and GitHub operations.")


@app.callback()
def _load_env() -> None:
    """Load .env from CWD or parent directories before running any subcommand."""
    load_dotenv()


app.add_typer(git_commit_app, name="git-commit")
app.add_typer(git_push_app, name="git-push")
app.add_typer(gh_pr_create_app, name="gh-pr-create")
app.add_typer(gh_pr_fetch_app, name="gh-pr-fetch")
app.add_typer(gh_pr_reply_app, name="gh-pr-reply")
app.add_typer(gh_pr_checks_app, name="gh-pr-checks")

if __name__ == "__main__":
    app()
