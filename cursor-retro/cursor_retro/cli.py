"""CLI entry point for cursor-retro."""

from pathlib import Path

import typer

from cursor_retro.extract import extract_conversations
from cursor_retro.workspace import CursorPaths

app = typer.Typer()
extract_app = typer.Typer(help="Extract conversations to markdown.")
app.add_typer(extract_app, name="extract")


def _get_cursor_paths() -> CursorPaths:
    """Return Cursor storage paths (injectable for tests)."""
    return CursorPaths()


@extract_app.callback(invoke_without_command=True)
def extract(
    ctx: typer.Context,
    workspace: str = typer.Option(".", help="Path to workspace root"),
    since: int = typer.Option(7, help="Only export conversations from the last N days"),
) -> None:
    """Extract conversations to markdown."""
    if ctx.invoked_subcommand is not None:
        return
    workspace_path = Path(workspace).resolve()
    paths = _get_cursor_paths()
    global_db = paths.global_storage / "state.vscdb"
    if not global_db.exists():
        typer.echo(f"Error: global Cursor DB not found: {global_db}", err=True)
        raise typer.Exit(1)
    output_dir = workspace_path / ".cursor-retro" / "conversations"

    existing = set(output_dir.glob("*.md")) if output_dir.is_dir() else set()
    extract_conversations(
        global_db,
        output_dir,
        since_days=since,
        workspace_path=workspace_path,
    )
    new_files = set(output_dir.glob("*.md")) - existing
    count = len(new_files)
    filenames = sorted(f.name for f in new_files)
    typer.echo(f"Exported {count} conversation(s):")
    for name in filenames:
        typer.echo(f"  {name}")


def main() -> None:
    """Entry point for the script."""
    app()


if __name__ == "__main__":
    main()
