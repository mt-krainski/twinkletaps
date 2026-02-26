"""Run CI checks for a PR and fetch failed run logs if any checks failed."""

import os
import re
import subprocess

import typer

OWNER_ENV = "GITHUB_OWNER"
REPO_ENV = "GITHUB_REPO"

app = typer.Typer(invoke_without_command=True)


def _extract_failed_run_ids(checks_output: str) -> list[str]:
    """Extract unique run IDs from failed check lines in gh pr checks output.

    Args:
        checks_output: Stdout from gh pr checks.

    Returns:
        Ordered list of unique run IDs for failed checks.
    """
    run_ids: list[str] = []
    seen: set[str] = set()
    for line in checks_output.splitlines():
        if "fail" in line.lower() and "/runs/" in line:
            match = re.search(r"/runs/(\d+)", line)
            if match:
                run_id = match.group(1)
                if run_id not in seen:
                    seen.add(run_id)
                    run_ids.append(run_id)
    return run_ids


def run_gh_pr_checks(
    pr_number: int,
    *,
    env: dict[str, str] | None = None,
) -> tuple[int, str]:
    """Run gh pr checks; fetch failed run logs if any checks failed.

    Args:
        pr_number: The pull request number.
        env: Optional env overrides (merged with os.environ).

    Returns:
        Tuple of (exit_code, combined_output).

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

    result = subprocess.run(
        ["gh", "pr", "checks", str(pr_number), "--repo", repo_spec],
        capture_output=True,
        text=True,
        env=environ,
    )

    if result.returncode != 0:
        return result.returncode, result.stderr or result.stdout

    output = result.stdout
    run_ids = _extract_failed_run_ids(result.stdout)
    for run_id in run_ids:
        log_result = subprocess.run(
            ["gh", "run", "view", run_id, "--log-failed", "--repo", repo_spec],
            capture_output=True,
            text=True,
            env=environ,
        )
        output += f"\n--- Failed logs for run {run_id} ---\n"
        output += log_result.stdout

    return 0, output


@app.callback()
def main(
    pr_number: int = typer.Argument(..., help="PR number"),
) -> None:
    """Show CI check statuses; fetch failed run logs if any checks failed."""
    try:
        code, output = run_gh_pr_checks(pr_number)
    except ValueError as e:
        typer.echo(f"gh-pr-checks: {e}", err=True)
        raise typer.Exit(1) from e

    if output:
        typer.echo(output.strip())
    raise typer.Exit(code)


if __name__ == "__main__":
    app()
