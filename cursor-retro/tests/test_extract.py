"""Tests for cursor_retro.extract."""

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cursor_retro.extract import (
    export_conversation,
    extract_conversations,
    get_conversation_messages,
    get_workspace_composer_ids,
)


def _create_workspace_db(path: Path, all_composers: list[dict]) -> None:
    """Create minimal workspace state.vscdb with ItemTable and composer.composerData."""
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value BLOB)")
    conn.execute(
        "INSERT INTO ItemTable (key, value) VALUES (?, ?)",
        ("composer.composerData", json.dumps({"allComposers": all_composers})),
    )
    conn.commit()
    conn.close()


def _create_global_db(
    path: Path,
    composer_metadata: dict,
    bubbles: dict[str, dict],
) -> None:
    """Create global state.vscdb with cursorDiskKV (composerData + bubbleId rows)."""
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


def test_get_workspace_composer_ids_returns_ids(tmp_path):
    """get_workspace_composer_ids returns composer IDs from workspace DB."""
    workspace_db = tmp_path / "state.vscdb"
    all_composers = [
        {"composerId": "id1", "createdAt": 1000, "name": "Chat 1"},
        {"composerId": "id2", "createdAt": 2000, "name": "Chat 2"},
    ]
    _create_workspace_db(workspace_db, all_composers)
    result = get_workspace_composer_ids(workspace_db, since_days=None)
    assert result == [
        {"composerId": "id1", "createdAt": 1000, "name": "Chat 1"},
        {"composerId": "id2", "createdAt": 2000, "name": "Chat 2"},
    ]


def test_get_workspace_composer_ids_filters_by_since_days(tmp_path):
    """get_workspace_composer_ids filters by createdAt when since_days is set."""
    workspace_db = tmp_path / "state.vscdb"
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    old_ms = int((datetime.now(timezone.utc) - timedelta(days=10)).timestamp() * 1000)
    all_composers = [
        {"composerId": "recent", "createdAt": now_ms, "name": "Recent"},
        {"composerId": "old", "createdAt": old_ms, "name": "Old"},
    ]
    _create_workspace_db(workspace_db, all_composers)
    result = get_workspace_composer_ids(workspace_db, since_days=7)
    assert len(result) == 1
    assert result[0]["composerId"] == "recent"


def test_get_conversation_messages_returns_ordered_messages(tmp_path):
    """get_conversation_messages returns messages in header order."""
    global_db = tmp_path / "global.vscdb"
    composer_metadata = {
        "composerId": "cid",
        "name": "Test",
        "fullConversationHeadersOnly": [
            {"bubbleId": "b1"},
            {"bubbleId": "b2"},
        ],
    }
    bubbles = {
        "b1": {"type": 1, "text": "Hello"},
        "b2": {"type": 2, "text": "Hi there"},
    }
    _create_global_db(global_db, composer_metadata, bubbles)
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
    workspace_db = tmp_path / "ws.vscdb"
    global_db = tmp_path / "global.vscdb"
    output_dir = tmp_path / "exports"
    output_dir.mkdir()
    (output_dir / "existing-id.md").write_text("existing", encoding="utf-8")
    _create_workspace_db(
        workspace_db,
        [
            {"composerId": "existing-id", "createdAt": 2000, "name": "Existing"},
        ],
    )
    composer_metadata = {
        "composerId": "existing-id",
        "fullConversationHeadersOnly": [{"bubbleId": "b1"}],
    }
    _create_global_db(global_db, composer_metadata, {"b1": {"type": 1, "text": "x"}})
    extract_conversations(workspace_db, global_db, output_dir, since_days=None)
    assert (output_dir / "existing-id.md").read_text(encoding="utf-8") == "existing"


def test_extract_conversations_writes_new_export(tmp_path):
    """extract_conversations writes new markdown for composers without existing file."""
    workspace_db = tmp_path / "ws.vscdb"
    global_db = tmp_path / "global.vscdb"
    output_dir = tmp_path / "exports"
    output_dir.mkdir()
    _create_workspace_db(
        workspace_db,
        [
            {"composerId": "new-id", "createdAt": 3000, "name": "New Chat"},
        ],
    )
    composer_metadata = {
        "composerId": "new-id",
        "name": "New Chat",
        "createdAt": 3000,
        "fullConversationHeadersOnly": [{"bubbleId": "b1"}],
    }
    _create_global_db(global_db, composer_metadata, {"b1": {"type": 1, "text": "Hi"}})
    extract_conversations(workspace_db, global_db, output_dir, since_days=None)
    out_file = output_dir / "new-id.md"
    assert out_file.exists()
    assert "New Chat" in out_file.read_text(encoding="utf-8")
    assert "Hi" in out_file.read_text(encoding="utf-8")
