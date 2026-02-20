"""Tests for cursor_retro.cli."""

from datetime import datetime, timezone

from typer.testing import CliRunner

from cursor_retro import cli
from tests.helpers import create_global_db

runner = CliRunner()


def test_cli_extract_exports_and_prints_summary(tmp_path, monkeypatch):
    """Extract subcommand exports conversations and prints count and filenames."""
    workspace_root = tmp_path / "my_project"
    workspace_root.mkdir()
    global_storage = tmp_path / "globalStorage"
    global_storage.mkdir()
    global_db = global_storage / "state.vscdb"

    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    create_global_db(
        global_db,
        {
            "composerId": "conv-1",
            "createdAt": now_ms,
            "name": "Chat One",
            "fullConversationHeadersOnly": [{"bubbleId": "b1"}],
            "allAttachedFileCodeChunksUris": [f"file://{workspace_root}/src/main.ts"],
        },
        {"b1": {"type": 1, "text": "Hello"}},
    )

    def fake_paths():
        from cursor_retro.workspace import CursorPaths

        return CursorPaths(
            global_storage=global_storage,
            workspace_storage=tmp_path / "ws",
        )

    monkeypatch.setattr(cli, "_get_cursor_paths", fake_paths)

    result = runner.invoke(
        cli.app,
        ["extract", "--workspace", str(workspace_root), "--since", "7"],
    )

    assert result.exit_code == 0
    out_dir = workspace_root / ".cursor-retro" / "conversations"
    assert (out_dir / "conv-1.md").exists()
    assert "Exported 1 conversation" in result.output
    assert "conv-1.md" in result.output
