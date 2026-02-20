"""CLI entry point for cursor-retro."""

import argparse
import sys
from pathlib import Path

from cursor_retro.extract import extract_conversations
from cursor_retro.workspace import CursorPaths


def _get_cursor_paths() -> CursorPaths:
    """Return Cursor storage paths (injectable for tests)."""
    return CursorPaths()


def cmd_extract(args: argparse.Namespace) -> int:
    """Run extract: export conversations from global DB, print count and filenames."""
    workspace_path = Path(args.workspace).resolve()
    paths = _get_cursor_paths()
    global_db = paths.global_storage / "state.vscdb"
    output_dir = workspace_path / ".cursor-retro" / "conversations"

    existing = set(output_dir.glob("*.md")) if output_dir.is_dir() else set()
    extract_conversations(
        global_db,
        output_dir,
        since_days=args.since,
        workspace_path=workspace_path,
    )
    new_files = set(output_dir.glob("*.md")) - existing
    count = len(new_files)
    filenames = sorted(f.name for f in new_files)
    print(f"Exported {count} conversation(s):")
    for name in filenames:
        print(f"  {name}")
    return 0


def main(argv: list[str] | None = None) -> int:
    """Parse args and dispatch to subcommand."""
    parser = argparse.ArgumentParser(prog="cursor-retro")
    subparsers = parser.add_subparsers(dest="cmd", required=True)
    extract_parser = subparsers.add_parser(
        "extract", help="Extract conversations to markdown"
    )
    extract_parser.add_argument(
        "--workspace",
        default=".",
        help="Path to workspace root (default: current directory)",
    )
    extract_parser.add_argument(
        "--since",
        type=int,
        default=7,
        help="Only export conversations from the last N days (default: 7)",
    )
    extract_parser.set_defaults(func=cmd_extract)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
