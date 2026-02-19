"""Extract Cursor composer conversations from workspace and global DBs to markdown."""

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

WORKSPACE_COMPOSER_KEY = "composer.composerData"


def get_workspace_composer_ids(
    workspace_db: Path, since_days: int | None
) -> list[dict]:
    """Read composer metadata from workspace DB, optionally filtered by age.

    Args:
        workspace_db: Path to workspace state.vscdb.
        since_days: If set, only return composers with createdAt within last N days.

    Returns:
        List of composer dicts (composerId, createdAt, name, ...) in order.
    """
    with sqlite3.connect(workspace_db) as conn:
        cur = conn.execute(
            "SELECT value FROM ItemTable WHERE key = ?",
            (WORKSPACE_COMPOSER_KEY,),
        )
        row = cur.fetchone()
    if not row:
        return []
    data = json.loads(row[0])
    composers = data.get("allComposers") or []
    if since_days is not None:
        cutoff_ms = int(
            (datetime.now(timezone.utc) - timedelta(days=since_days)).timestamp() * 1000
        )
        composers = [c for c in composers if (c.get("createdAt") or 0) >= cutoff_ms]
    return composers


def get_conversation_messages(global_db: Path, composer_id: str) -> list[dict]:
    """Fetch full message list for a composer from the global DB.

    Args:
        global_db: Path to global state.vscdb.
        composer_id: Composer ID.

    Returns:
        List of message dicts (type, text, richText, ...) in conversation order.
    """
    with sqlite3.connect(global_db) as conn:
        cur = conn.execute(
            "SELECT value FROM cursorDiskKV WHERE key = ?",
            (f"composerData:{composer_id}",),
        )
        row = cur.fetchone()
        if not row:
            return []
        meta = json.loads(row[0])
        headers = meta.get("fullConversationHeadersOnly") or []
        bubble_ids = [h.get("bubbleId") for h in headers if "bubbleId" in h]
        messages = []
        for bid in bubble_ids:
            cur = conn.execute(
                "SELECT value FROM cursorDiskKV WHERE key = ?",
                (f"bubbleId:{composer_id}:{bid}",),
            )
            r = cur.fetchone()
            if r:
                messages.append(json.loads(r[0]))
    return messages


def export_conversation(
    output_dir: Path,
    metadata: dict,
    messages: list[dict],
) -> None:
    """Write a single conversation to a markdown file named <composerId>.md.

    Args:
        output_dir: Directory to write the file into.
        metadata: Composer metadata (composerId, name, createdAt, ...).
        messages: List of message dicts from get_conversation_messages.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    composer_id = metadata.get("composerId", "unknown")
    name = metadata.get("name") or "Untitled"
    created_at = metadata.get("createdAt")
    path = output_dir / f"{composer_id}.md"
    lines = [
        f"# {name}\n",
        f"**Composer ID:** `{composer_id}`\n",
    ]
    if created_at:
        dt = datetime.fromtimestamp(created_at / 1000, tz=timezone.utc)
        lines.append(f"**Created:** {dt.strftime('%Y-%m-%d %H:%M:%S')} UTC\n")
    lines.append(f"**Messages:** {len(messages)}\n\n---\n\n")
    for msg in messages:
        msg_type = msg.get("type", 0)
        if msg_type == 1:
            lines.append("## User\n\n")
        elif msg_type == 2:
            lines.append("## Assistant\n\n")
        else:
            lines.append(f"## Message (type {msg_type})\n\n")
        text = msg.get("text")
        if text:
            lines.append(f"{text}\n\n")
        else:
            rich = msg.get("richText")
            if rich:
                try:
                    obj = json.loads(rich) if isinstance(rich, str) else rich
                    snippet = json.dumps(obj, indent=2)[:1000]
                    lines.append(f"```json\n{snippet}...\n```\n\n")
                except (TypeError, ValueError):
                    lines.append(f"{str(rich)[:500]}...\n\n")
        lines.append("---\n\n")
    path.write_text("".join(lines), encoding="utf-8")


def extract_conversations(
    workspace_db: Path,
    global_db: Path,
    output_dir: Path,
    since_days: int | None = None,
) -> None:
    """Extract all workspace conversations to markdown; skip already-exported.

    Args:
        workspace_db: Path to workspace state.vscdb.
        global_db: Path to global state.vscdb.
        output_dir: Directory for markdown files (one per composer).
        since_days: If set, only export composers from last N days.
    """
    output_dir = Path(output_dir)
    composers = get_workspace_composer_ids(workspace_db, since_days)
    for meta in composers:
        cid = meta.get("composerId")
        if not cid:
            continue
        if (output_dir / f"{cid}.md").exists():
            continue
        messages = get_conversation_messages(global_db, cid)
        export_conversation(output_dir, meta, messages)
