"""Tests for cursor_retro.extract."""

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cursor_retro.extract import (
    export_conversation,
    extract_conversations,
    get_composer_ids,
    get_conversation_messages,
)


def _create_global_db(
    path: Path,
    composer_metadata: dict | list[dict],
    bubbles: dict[str, dict] | None = None,
) -> None:
    """Create global state.vscdb with cursorDiskKV (composerData + bubbleId rows).

    Args:
        path: Where to create the SQLite file.
        composer_metadata: A single composer dict or a list of them.
        bubbles: Mapping of bubbleId to message dict. Applied to the first
            composer when composer_metadata is a list.
    """
    if isinstance(composer_metadata, dict):
        composer_metadata = [composer_metadata]
    if bubbles is None:
        bubbles = {}

    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE cursorDiskKV (key TEXT PRIMARY KEY, value BLOB)")
    for meta in composer_metadata:
        cid = meta.get("composerId", "test-composer-id")
        conn.execute(
            "INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)",
            (f"composerData:{cid}", json.dumps(meta)),
        )
    first_cid = composer_metadata[0].get("composerId", "test-composer-id")
    for bubble_id, bubble in bubbles.items():
        conn.execute(
            "INSERT OR REPLACE INTO cursorDiskKV (key, value) VALUES (?, ?)",
            (f"bubbleId:{first_cid}:{bubble_id}", json.dumps(bubble)),
        )
    conn.commit()
    conn.close()


def test_get_composer_ids_returns_all(tmp_path):
    """get_composer_ids returns all composers from global DB."""
    global_db = tmp_path / "state.vscdb"
    _create_global_db(
        global_db,
        [
            {"composerId": "id1", "createdAt": 1000, "name": "Chat 1"},
            {"composerId": "id2", "createdAt": 2000, "name": "Chat 2"},
        ],
    )
    result = get_composer_ids(global_db, since_days=None)
    ids = [c["composerId"] for c in result]
    assert ids == ["id1", "id2"]


def test_get_composer_ids_filters_by_since_days(tmp_path):
    """get_composer_ids filters by createdAt when since_days is set."""
    global_db = tmp_path / "state.vscdb"
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    old_ms = int((datetime.now(timezone.utc) - timedelta(days=10)).timestamp() * 1000)
    _create_global_db(
        global_db,
        [
            {"composerId": "recent", "createdAt": now_ms, "name": "Recent"},
            {"composerId": "old", "createdAt": old_ms, "name": "Old"},
        ],
    )
    result = get_composer_ids(global_db, since_days=7)
    assert len(result) == 1
    assert result[0]["composerId"] == "recent"


def test_get_composer_ids_filters_by_workspace_path(tmp_path):
    """get_composer_ids only returns composers referencing the workspace path."""
    global_db = tmp_path / "state.vscdb"
    ws = Path("/projects/my-app")
    _create_global_db(
        global_db,
        [
            {
                "composerId": "match",
                "createdAt": 1000,
                "allAttachedFileCodeChunksUris": [f"file://{ws}/src/main.ts"],
            },
            {
                "composerId": "other",
                "createdAt": 2000,
                "allAttachedFileCodeChunksUris": ["file:///other/project/foo.py"],
            },
            {
                "composerId": "none",
                "createdAt": 3000,
            },
        ],
    )
    result = get_composer_ids(global_db, since_days=None, workspace_path=ws)
    ids = [c["composerId"] for c in result]
    assert ids == ["match"]


def test_get_conversation_messages_returns_ordered_messages(tmp_path):
    """get_conversation_messages returns messages in header order."""
    global_db = tmp_path / "global.vscdb"
    _create_global_db(
        global_db,
        {
            "composerId": "cid",
            "name": "Test",
            "fullConversationHeadersOnly": [
                {"bubbleId": "b1"},
                {"bubbleId": "b2"},
            ],
        },
        {"b1": {"type": 1, "text": "Hello"}, "b2": {"type": 2, "text": "Hi there"}},
    )
    messages = get_conversation_messages(global_db, "cid")
    assert len(messages) == 2
    assert messages[0]["text"] == "Hello" and messages[0]["type"] == 1
    assert messages[1]["text"] == "Hi there" and messages[1]["type"] == 2


def test_export_conversation_writes_markdown(tmp_path):
    """export_conversation writes a markdown file with metadata and messages."""
    output_dir = tmp_path / "out"
    output_dir.mkdir()
    metadata = {"composerId": "mid", "name": "My Chat", "createdAt": 1700000000000}
    messages = [
        {"type": 1, "text": "User message"},
        {"type": 2, "text": "Assistant reply"},
    ]
    export_conversation(output_dir, metadata, messages)
    out_file = output_dir / "mid.md"
    assert out_file.exists()
    content = out_file.read_text(encoding="utf-8")
    assert "My Chat" in content
    assert "mid" in content
    assert "User message" in content
    assert "Assistant reply" in content


def test_extract_conversations_skips_existing_file(tmp_path):
    """extract_conversations skips composer when output file already exists."""
    global_db = tmp_path / "global.vscdb"
    output_dir = tmp_path / "exports"
    output_dir.mkdir()
    (output_dir / "existing-id.md").write_text("existing", encoding="utf-8")
    _create_global_db(
        global_db,
        {
            "composerId": "existing-id",
            "createdAt": 2000,
            "name": "Existing",
            "fullConversationHeadersOnly": [{"bubbleId": "b1"}],
        },
        {"b1": {"type": 1, "text": "x"}},
    )
    extract_conversations(global_db, output_dir, since_days=None)
    assert (output_dir / "existing-id.md").read_text(encoding="utf-8") == "existing"


def test_extract_conversations_writes_new_export(tmp_path):
    """extract_conversations writes new markdown for composers without existing file."""
    global_db = tmp_path / "global.vscdb"
    output_dir = tmp_path / "exports"
    output_dir.mkdir()
    _create_global_db(
        global_db,
        {
            "composerId": "new-id",
            "name": "New Chat",
            "createdAt": 3000,
            "fullConversationHeadersOnly": [{"bubbleId": "b1"}],
        },
        {"b1": {"type": 1, "text": "Hi"}},
    )
    extract_conversations(global_db, output_dir, since_days=None)
    out_file = output_dir / "new-id.md"
    assert out_file.exists()
    assert "New Chat" in out_file.read_text(encoding="utf-8")
    assert "Hi" in out_file.read_text(encoding="utf-8")
