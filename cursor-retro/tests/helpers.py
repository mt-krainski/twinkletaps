"""Shared test helpers for cursor-retro."""

import json
import sqlite3
from pathlib import Path


def create_global_db(
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
