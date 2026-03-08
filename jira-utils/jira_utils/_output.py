"""Shared output helpers for CLI commands."""

from __future__ import annotations

import json

import typer

from jira_utils.client import JiraApiError


def output_json(data: dict | list | None, *, pretty: bool = False) -> None:
    """Write JSON to stdout."""
    indent = 2 if pretty else None
    typer.echo(json.dumps(data, indent=indent))


def handle_error(e: Exception) -> None:
    """Print error to stderr and exit non-zero."""
    if isinstance(e, JiraApiError):
        typer.echo(
            json.dumps({"error": True, "status": e.status_code, "body": e.body}),
            err=True,
        )
    else:
        typer.echo(f"error: {e}", err=True)
    raise typer.Exit(1)
