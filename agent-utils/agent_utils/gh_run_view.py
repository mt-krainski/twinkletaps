"""View a GitHub Actions run and optionally fetch failed logs."""

import os
import subprocess

import typer

OWNER_ENV = "GITHUB_OWNER"
REPO_ENV = "GITHUB_REPO"

app = typer.Typer(invoke_without_command=True)


def run_gh_run_view(
    run_id: str,
    *,
    log_failed: bool = False,
    env: dict[str, str] | None = None,
) -> tuple[int, str]:
    """View a GitHub Actions run.

    Args:
        run_id: The workflow run ID.
        log_failed: If True, fetch only failed step logs (--log-failed).
        env: Optional env overrides (merged with os.environ).

    Returns:
        Tuple of (exit_code, output).

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

    repo_spec = f"{owner}/{repo}"
    cmd = ["gh", "run", "view", run_id, "--repo", repo_spec]
    if log_failed:
        cmd.append("--log-failed")

    result = subprocess.run(cmd, capture_output=True, text=True, env=environ)  # noqa: S603
    output = result.stdout or result.stderr
    return result.returncode, output


@app.callback()
def main(
    run_id: str = typer.Argument(..., help="Workflow run ID"),
    log_failed: bool = typer.Option(
        False, "--log-failed", help="Show only failed step logs"
    ),
) -> None:
    """View a GitHub Actions workflow run."""
    try:
        code, output = run_gh_run_view(run_id, log_failed=log_failed)
    except ValueError as e:
        typer.echo(f"gh-run-view: {e}", err=True)
        raise typer.Exit(1) from e

    if output:
        typer.echo(output.strip())
    raise typer.Exit(code)


if __name__ == "__main__":
    app()
