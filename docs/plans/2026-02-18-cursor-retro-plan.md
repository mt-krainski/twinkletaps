# cursor-retro Implementation Plan

> Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build a CLI tool that extracts Cursor conversations per-workspace, plus a Cursor skill that orchestrates weekly AI-assisted retrospectives.

**Architecture:** Python CLI (`cursor-retro extract`) reads Cursor's SQLite DBs to export conversations filtered by workspace and time. A Cursor skill (`.cursor/skills/retrospective/SKILL.md`) orchestrates the full retro flow using subagents for parallel analysis.

**Tech Stack:** Python 3.12, uv, sqlite3 (stdlib), argparse, pathlib. No external runtime deps.

---

### Task 1: Scaffold the package with cookiecutter template

**Files:**
- Create: `cursor-retro/` (entire package directory via cookiecutter)
- Modify: `.gitignore` (add `.cursor-retro/` for conversation exports)

**Step 1: Generate the package**

```bash
cd /Users/mateusz/Projects/twinkletaps
uvx cookiecutter gh:mt-krainski/matts-python-package-template \
  --no-input \
  project_name="cursor-retro" \
  author="Mateusz Krainski" \
  email="mateusz@krainski.eu" \
  use_jupyter="n"
```

**Step 2: Verify structure**

```bash
ls cursor-retro/
```

Expected: standard package layout with `pyproject.toml`, `src/` or package dir, tests, etc.

**Step 3: Install dev environment**

```bash
cd cursor-retro
poe configure
```

**Step 4: Add `.cursor-retro/` to root gitignore**

Append to `.gitignore`:
```
# cursor-retro conversation exports (sensitive, local-only)
.cursor-retro/
```

**Step 5: Verify lint/tests pass on empty package**

```bash
poe lint
poe test
```

Expected: PASS (template defaults)

**Step 6: Commit**

```bash
git add cursor-retro/ .gitignore
git commit -m "scaffold cursor-retro package from cookiecutter template"
```

---

### Task 2: Implement workspace resolution module

**Files:**
- Create: `cursor-retro/cursor_retro/workspace.py`
- Create: `cursor-retro/tests/test_workspace.py`

**Step 1: Write the failing test**

```python
# tests/test_workspace.py
from pathlib import Path
from unittest.mock import patch, MagicMock
import json
import pytest

from cursor_retro.workspace import find_workspace_storage_hash, CursorPaths


def test_cursor_paths_defaults():
    paths = CursorPaths()
    assert paths.global_storage.name == "globalStorage"
    assert paths.workspace_storage.name == "workspaceStorage"


def test_find_workspace_storage_hash(tmp_path):
    ws_storage = tmp_path / "workspaceStorage"
    hash_dir = ws_storage / "abc123"
    hash_dir.mkdir(parents=True)
    ws_json = hash_dir / "workspace.json"
    ws_json.write_text(json.dumps({"folder": "file:///Users/me/projects/myproject"}))

    paths = CursorPaths(
        global_storage=tmp_path / "globalStorage",
        workspace_storage=ws_storage,
    )
    result = find_workspace_storage_hash(
        Path("/Users/me/projects/myproject"), paths
    )
    assert result == "abc123"


def test_find_workspace_storage_hash_not_found(tmp_path):
    ws_storage = tmp_path / "workspaceStorage"
    ws_storage.mkdir()

    paths = CursorPaths(
        global_storage=tmp_path / "globalStorage",
        workspace_storage=ws_storage,
    )
    with pytest.raises(ValueError, match="No workspace storage found"):
        find_workspace_storage_hash(Path("/nonexistent"), paths)
```

**Step 2: Run test to verify it fails**

```bash
poe test -- tests/test_workspace.py -v
```

Expected: FAIL (module doesn't exist)

**Step 3: Write the implementation**

```python
# cursor_retro/workspace.py
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import unquote, urlparse
import json


def _default_cursor_base() -> Path:
    return Path.home() / "Library" / "Application Support" / "Cursor" / "User"


@dataclass
class CursorPaths:
    global_storage: Path = field(default_factory=lambda: _default_cursor_base() / "globalStorage")
    workspace_storage: Path = field(default_factory=lambda: _default_cursor_base() / "workspaceStorage")

    @property
    def global_db(self) -> Path:
        return self.global_storage / "state.vscdb"


def find_workspace_storage_hash(workspace_path: Path, paths: CursorPaths) -> str:
    """Find the workspace storage hash directory for a given workspace path."""
    workspace_path = workspace_path.resolve()

    for hash_dir in paths.workspace_storage.iterdir():
        if not hash_dir.is_dir():
            continue
        ws_json = hash_dir / "workspace.json"
        if not ws_json.exists():
            continue

        data = json.loads(ws_json.read_text())
        folder_uri = data.get("folder", "")
        parsed = urlparse(folder_uri)
        folder_path = Path(unquote(parsed.path)).resolve()

        if folder_path == workspace_path:
            return hash_dir.name

    raise ValueError(
        f"No workspace storage found for {workspace_path}. "
        f"Has this workspace been opened in Cursor?"
    )
```

**Step 4: Run test to verify it passes**

```bash
poe test -- tests/test_workspace.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add cursor-retro/cursor_retro/workspace.py cursor-retro/tests/test_workspace.py
git commit -m "add workspace resolution module"
```

---

### Task 3: Implement conversation extraction module

**Files:**
- Create: `cursor-retro/cursor_retro/extract.py`
- Create: `cursor-retro/tests/test_extract.py`

This module reads composer IDs from the workspace DB, fetches full messages from the global DB, and writes markdown exports.

**Step 1: Write the failing tests**

```python
# tests/test_extract.py
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from cursor_retro.extract import (
    get_workspace_composer_ids,
    get_conversation_messages,
    export_conversation,
    extract_conversations,
)
from cursor_retro.workspace import CursorPaths


def _create_workspace_db(db_path: Path, composers: list[dict]):
    """Helper to create a workspace DB with composer data."""
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)")
    conn.execute(
        "INSERT INTO ItemTable (key, value) VALUES (?, ?)",
        ("composer.composerData", json.dumps({"allComposers": composers})),
    )
    conn.commit()
    conn.close()


def _create_global_db(db_path: Path, composer_data: dict, bubbles: dict):
    """Helper to create a global DB with conversations."""
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE cursorDiskKV (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)")
    for cid, data in composer_data.items():
        conn.execute(
            "INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)",
            (f"composerData:{cid}", json.dumps(data)),
        )
    for key, data in bubbles.items():
        conn.execute(
            "INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)",
            (key, json.dumps(data)),
        )
    conn.commit()
    conn.close()


def test_get_workspace_composer_ids(tmp_path):
    ws_db = tmp_path / "state.vscdb"
    now_ms = int(datetime.now().timestamp() * 1000)
    composers = [
        {"composerId": "aaa", "name": "Chat 1", "createdAt": now_ms},
        {"composerId": "bbb", "name": "Chat 2", "createdAt": now_ms - 86400_000 * 10},
    ]
    _create_workspace_db(ws_db, composers)

    result = get_workspace_composer_ids(ws_db, since_days=7)
    assert len(result) == 1
    assert result[0]["composerId"] == "aaa"


def test_get_workspace_composer_ids_no_filter(tmp_path):
    ws_db = tmp_path / "state.vscdb"
    now_ms = int(datetime.now().timestamp() * 1000)
    composers = [
        {"composerId": "aaa", "name": "Chat 1", "createdAt": now_ms},
        {"composerId": "bbb", "name": "Chat 2", "createdAt": now_ms - 86400_000 * 10},
    ]
    _create_workspace_db(ws_db, composers)

    result = get_workspace_composer_ids(ws_db, since_days=None)
    assert len(result) == 2


def test_get_conversation_messages(tmp_path):
    global_db = tmp_path / "global.vscdb"
    composer_id = "test-123"

    composer_data = {
        composer_id: {
            "composerId": composer_id,
            "name": "Test Chat",
            "createdAt": 1700000000000,
            "fullConversationHeadersOnly": [
                {"bubbleId": "b1"},
                {"bubbleId": "b2"},
            ],
        }
    }
    bubbles = {
        f"bubbleId:{composer_id}:b1": {"type": 1, "text": "Hello"},
        f"bubbleId:{composer_id}:b2": {"type": 2, "text": "Hi there"},
    }
    _create_global_db(global_db, composer_data, bubbles)

    messages = get_conversation_messages(global_db, composer_id)
    assert len(messages) == 2
    assert messages[0]["type"] == 1
    assert messages[0]["text"] == "Hello"
    assert messages[1]["type"] == 2
    assert messages[1]["text"] == "Hi there"


def test_export_conversation(tmp_path):
    output_dir = tmp_path / "output"
    output_dir.mkdir()

    metadata = {"composerId": "abc", "name": "My Chat", "createdAt": 1700000000000}
    messages = [
        {"type": 1, "text": "User message"},
        {"type": 2, "text": "Assistant response"},
    ]

    path = export_conversation(output_dir, metadata, messages)
    assert path.exists()
    content = path.read_text()
    assert "My Chat" in content
    assert "User message" in content
    assert "Assistant response" in content


def test_extract_conversations_incremental(tmp_path):
    """Already-exported conversations are skipped."""
    output_dir = tmp_path / "output"
    output_dir.mkdir()

    # Pre-existing export
    (output_dir / "abc.md").write_text("already exported")

    ws_db = tmp_path / "ws.vscdb"
    global_db = tmp_path / "global.vscdb"

    now_ms = int(datetime.now().timestamp() * 1000)
    _create_workspace_db(ws_db, [
        {"composerId": "abc", "name": "Old Chat", "createdAt": now_ms},
        {"composerId": "def", "name": "New Chat", "createdAt": now_ms},
    ])
    _create_global_db(global_db, {
        "def": {
            "composerId": "def",
            "name": "New Chat",
            "createdAt": now_ms,
            "fullConversationHeadersOnly": [{"bubbleId": "b1"}],
        },
    }, {
        "bubbleId:def:b1": {"type": 1, "text": "Hello"},
    })

    paths = CursorPaths(global_storage=tmp_path, workspace_storage=tmp_path)
    exported = extract_conversations(
        workspace_db=ws_db,
        global_db=global_db,
        output_dir=output_dir,
        since_days=7,
    )

    assert len(exported) == 1
    assert exported[0].name == "def.md"
    assert (output_dir / "abc.md").read_text() == "already exported"
```

**Step 2: Run tests to verify they fail**

```bash
poe test -- tests/test_extract.py -v
```

Expected: FAIL (module doesn't exist)

**Step 3: Write the implementation**

```python
# cursor_retro/extract.py
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path


def get_workspace_composer_ids(
    workspace_db: Path, since_days: int | None = 7
) -> list[dict]:
    """Get composer metadata from a workspace-level DB, optionally filtered by age."""
    conn = sqlite3.connect(workspace_db)
    try:
        cursor = conn.execute(
            "SELECT value FROM ItemTable WHERE key = 'composer.composerData'"
        )
        row = cursor.fetchone()
        if not row:
            return []

        data = json.loads(row[0])
        composers = data.get("allComposers", [])

        if since_days is None:
            return composers

        cutoff_ms = int((datetime.now() - timedelta(days=since_days)).timestamp() * 1000)
        return [c for c in composers if c.get("createdAt", 0) >= cutoff_ms]
    finally:
        conn.close()


def get_conversation_messages(global_db: Path, composer_id: str) -> list[dict]:
    """Fetch all messages for a conversation from the global DB."""
    conn = sqlite3.connect(global_db)
    try:
        cursor = conn.execute(
            "SELECT value FROM cursorDiskKV WHERE key = ?",
            (f"composerData:{composer_id}",),
        )
        row = cursor.fetchone()
        if not row:
            return []

        composer_data = json.loads(row[0])
        headers = composer_data.get("fullConversationHeadersOnly", [])
        bubble_ids = [h["bubbleId"] for h in headers if "bubbleId" in h]

        messages = []
        for bubble_id in bubble_ids:
            cursor = conn.execute(
                "SELECT value FROM cursorDiskKV WHERE key = ?",
                (f"bubbleId:{composer_id}:{bubble_id}",),
            )
            bubble_row = cursor.fetchone()
            if bubble_row:
                messages.append(json.loads(bubble_row[0]))

        return messages
    finally:
        conn.close()


def export_conversation(
    output_dir: Path, metadata: dict, messages: list[dict]
) -> Path:
    """Write a conversation to a markdown file."""
    composer_id = metadata["composerId"]
    name = metadata.get("name", "Untitled Chat")
    created_at = metadata.get("createdAt")

    filepath = output_dir / f"{composer_id}.md"

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(f"# {name}\n\n")
        f.write(f"**Composer ID:** `{composer_id}`\n")
        if created_at:
            dt = datetime.fromtimestamp(created_at / 1000)
            f.write(f"**Created:** {dt.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Messages:** {len(messages)}\n\n")
        f.write("---\n\n")

        for msg in messages:
            msg_type = msg.get("type")
            text = msg.get("text", "")

            if msg_type == 1:
                f.write("## User\n\n")
            elif msg_type == 2:
                f.write("## Assistant\n\n")
            else:
                f.write(f"## Message (type {msg_type})\n\n")

            if text:
                f.write(f"{text}\n\n")

            f.write("---\n\n")

    return filepath


def extract_conversations(
    workspace_db: Path,
    global_db: Path,
    output_dir: Path,
    since_days: int | None = 7,
) -> list[Path]:
    """Extract new conversations to markdown files. Skips already-exported ones."""
    output_dir.mkdir(parents=True, exist_ok=True)

    composers = get_workspace_composer_ids(workspace_db, since_days)
    exported = []

    for composer_meta in composers:
        composer_id = composer_meta.get("composerId")
        if not composer_id:
            continue

        output_path = output_dir / f"{composer_id}.md"
        if output_path.exists():
            continue

        messages = get_conversation_messages(global_db, composer_id)
        if not messages:
            continue

        path = export_conversation(output_dir, composer_meta, messages)
        exported.append(path)

    return exported
```

**Step 4: Run tests to verify they pass**

```bash
poe test -- tests/test_extract.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add cursor-retro/cursor_retro/extract.py cursor-retro/tests/test_extract.py
git commit -m "add conversation extraction module"
```

---

### Task 4: Implement CLI entry point

**Files:**
- Create: `cursor-retro/cursor_retro/cli.py`
- Modify: `cursor-retro/pyproject.toml` (add script entry point)
- Create: `cursor-retro/tests/test_cli.py`

**Step 1: Write the failing test**

```python
# tests/test_cli.py
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

import pytest

from cursor_retro.cli import main


def _setup_dbs(tmp_path, workspace_path="/Users/me/myproject"):
    """Set up workspace and global DBs for CLI testing."""
    ws_storage = tmp_path / "workspaceStorage"
    hash_dir = ws_storage / "testhash"
    hash_dir.mkdir(parents=True)

    (hash_dir / "workspace.json").write_text(
        json.dumps({"folder": f"file://{workspace_path}"})
    )

    ws_db = hash_dir / "state.vscdb"
    conn = sqlite3.connect(ws_db)
    conn.execute("CREATE TABLE ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)")
    now_ms = int(datetime.now().timestamp() * 1000)
    conn.execute(
        "INSERT INTO ItemTable (key, value) VALUES (?, ?)",
        ("composer.composerData", json.dumps({
            "allComposers": [
                {"composerId": "chat1", "name": "Test Chat", "createdAt": now_ms},
            ],
        })),
    )
    conn.commit()
    conn.close()

    global_storage = tmp_path / "globalStorage"
    global_storage.mkdir()
    global_db = global_storage / "state.vscdb"
    conn = sqlite3.connect(global_db)
    conn.execute("CREATE TABLE cursorDiskKV (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)")
    conn.execute(
        "INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)",
        ("composerData:chat1", json.dumps({
            "composerId": "chat1",
            "name": "Test Chat",
            "createdAt": now_ms,
            "fullConversationHeadersOnly": [{"bubbleId": "b1"}],
        })),
    )
    conn.execute(
        "INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)",
        ("bubbleId:chat1:b1", json.dumps({"type": 1, "text": "Hello world"})),
    )
    conn.commit()
    conn.close()

    return tmp_path


def test_cli_extract(tmp_path, monkeypatch):
    workspace_path = str(tmp_path / "myproject")
    Path(workspace_path).mkdir()

    cursor_base = _setup_dbs(tmp_path, workspace_path)
    output_dir = Path(workspace_path) / ".cursor-retro" / "conversations"

    monkeypatch.setattr(
        "cursor_retro.cli._get_cursor_paths",
        lambda: __import__("cursor_retro.workspace", fromlist=["CursorPaths"]).CursorPaths(
            global_storage=cursor_base / "globalStorage",
            workspace_storage=cursor_base / "workspaceStorage",
        ),
    )

    main(["extract", "--workspace", workspace_path, "--since", "7"])

    assert output_dir.exists()
    files = list(output_dir.glob("*.md"))
    assert len(files) == 1
    assert "Hello world" in files[0].read_text()
```

**Step 2: Run test to verify it fails**

```bash
poe test -- tests/test_cli.py -v
```

Expected: FAIL

**Step 3: Write the implementation**

```python
# cursor_retro/cli.py
import argparse
import sys
from pathlib import Path

from cursor_retro.extract import extract_conversations
from cursor_retro.workspace import CursorPaths, find_workspace_storage_hash


def _get_cursor_paths() -> CursorPaths:
    return CursorPaths()


def cmd_extract(args: argparse.Namespace) -> None:
    workspace_path = Path(args.workspace).resolve()
    since_days = args.since

    paths = _get_cursor_paths()
    ws_hash = find_workspace_storage_hash(workspace_path, paths)

    workspace_db = paths.workspace_storage / ws_hash / "state.vscdb"
    global_db = paths.global_db
    output_dir = workspace_path / ".cursor-retro" / "conversations"

    exported = extract_conversations(
        workspace_db=workspace_db,
        global_db=global_db,
        output_dir=output_dir,
        since_days=since_days,
    )

    print(f"Exported {len(exported)} new conversation(s) to {output_dir}")
    for path in exported:
        print(f"  {path.name}")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="cursor-retro",
        description="Extract and analyze Cursor conversation history",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    extract_parser = subparsers.add_parser("extract", help="Export conversations")
    extract_parser.add_argument(
        "--workspace",
        default=".",
        help="Path to workspace root (default: current directory)",
    )
    extract_parser.add_argument(
        "--since",
        type=int,
        default=7,
        help="Export conversations from the last N days (default: 7)",
    )

    args = parser.parse_args(argv)

    if args.command == "extract":
        cmd_extract(args)


if __name__ == "__main__":
    main()
```

**Step 4: Add script entry point to pyproject.toml**

Add under `[project.scripts]` (or equivalent section based on template):
```toml
[project.scripts]
cursor-retro = "cursor_retro.cli:main"
```

**Step 5: Run test to verify it passes**

```bash
poe test -- tests/test_cli.py -v
```

Expected: PASS

**Step 6: Run all tests**

```bash
poe test
poe lint
```

Expected: all PASS

**Step 7: Commit**

```bash
git add cursor-retro/cursor_retro/cli.py cursor-retro/tests/test_cli.py cursor-retro/pyproject.toml
git commit -m "add CLI entry point for cursor-retro extract"
```

---

### Task 5: Write the retrospective skill

**Files:**
- Create: `.cursor/skills/retrospective/SKILL.md`

**Step 1: Write the skill file**

The skill orchestrates the full retro. It:
1. Runs `cursor-retro extract`
2. Fires subagents per conversation file
3. Aggregates and loads history
4. Researches solutions for identified issues
5. Presents summary and opens discussion
6. Saves retro file

See design doc for full spec. The skill file itself is the prompt that coordinates Cursor's agent through each step.

**Step 2: Create retrospectives directory**

```bash
mkdir -p .cursor/retrospectives
```

Create `.cursor/retrospectives/.gitkeep` so the directory exists in git.

**Step 3: Manual verification**

- Open a new Cursor agent session in the twinkletaps workspace
- Reference the retrospective skill
- Verify it can run `cursor-retro extract` and produce output
- Verify it reads conversation files and attempts analysis

**Step 4: Commit**

```bash
git add .cursor/skills/retrospective/SKILL.md .cursor/retrospectives/.gitkeep
git commit -m "add retrospective skill for weekly AI-assisted retros"
```

---

### Task 6: End-to-end smoke test

**Step 1: Run extraction against real workspace**

```bash
cd /Users/mateusz/Projects/twinkletaps
cursor-retro extract --since 7
```

Verify:
- `.cursor-retro/conversations/` directory created
- Markdown files present with real conversation content
- File content is readable and well-formatted

**Step 2: Run again (incremental)**

```bash
cursor-retro extract --since 7
```

Verify: "Exported 0 new conversation(s)" (all already exported)

**Step 3: Trigger retrospective skill in Cursor**

Open new agent session, reference the skill, and verify the full flow works end-to-end.

**Step 4: Final commit if any fixes needed**

```bash
poe test
poe lint
git add -A && git commit -m "fix: smoke test adjustments"
```
