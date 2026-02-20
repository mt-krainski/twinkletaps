"""Tests for cursor_retro.cli."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from cursor_retro import cli


def _create_global_db(
    path: Path,
    composer_metadata: dict,
    bubbles: dict[str, dict],
) -> None:
    """Create global state.vscdb with cursorDiskKV (composerData + bubbleId rows)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE cursorDiskKV (key TEXT PRIMARY KEY, value BLOB)")
    cid = composer_metadata.get("composerId", "test-composer-id")
    conn.execute(
        "INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)",
        (f"composerData:{cid}", json.dumps(composer_metadata)),
    )
    for bubble_id, bubble in bubbles.items():
        conn.execute(
            "INSERT OR REPLACE INTO cursorDiskKV (key, value) VALUES (?, ?)",
            (f"bubbleId:{cid}:{bubble_id}", json.dumps(bubble)),
        )
    conn.commit()
    conn.close()


def test_cli_extract_exports_and_prints_summary(tmp_path, monkeypatch, capsys):
    """Extract subcommand exports conversations and prints count and filenames."""
    workspace_root = tmp_path / "my_project"
    workspace_root.mkdir()
    global_storage = tmp_path / "globalStorage"
    global_storage.mkdir()
    global_db = global_storage / "state.vscdb"

    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    _create_global_db(
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

    cli.main(["extract", "--workspace", str(workspace_root), "--since", "7"])

    out_dir = workspace_root / ".cursor-retro" / "conversations"
    assert (out_dir / "conv-1.md").exists()
    captured = capsys.readouterr()
    assert "1" in captured.out
    assert "conv-1.md" in captured.out
