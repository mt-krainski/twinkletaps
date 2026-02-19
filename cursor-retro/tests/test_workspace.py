"""Tests for cursor_retro.workspace."""

from pathlib import Path

import pytest

from cursor_retro.workspace import CursorPaths, find_workspace_storage_hash


def test_cursor_paths_defaults():
    """CursorPaths uses macOS defaults when not overridden."""
    paths = CursorPaths()
    assert "Cursor" in str(paths.global_storage)
    assert "globalStorage" in str(paths.global_storage)
    assert "workspaceStorage" in str(paths.workspace_storage)


def test_find_workspace_storage_hash_found(tmp_path):
    """find_workspace_storage_hash returns hash when workspace.json folder matches."""
    ws_storage = tmp_path / "workspaceStorage"
    ws_storage.mkdir()
    hash_dir = ws_storage / "abc123hash"
    hash_dir.mkdir()
    target_path = Path("/some/project/root")
    (hash_dir / "workspace.json").write_text(
        '{"folder": "file:///some/project/root"}', encoding="utf-8"
    )
    paths = CursorPaths(
        workspace_storage=ws_storage, global_storage=tmp_path / "global"
    )
    result = find_workspace_storage_hash(target_path, paths)
    assert result == "abc123hash"


def test_find_workspace_storage_hash_trailing_slash_normalized(tmp_path):
    """Folder URI with trailing slash still matches workspace path."""
    ws_storage = tmp_path / "workspaceStorage"
    ws_storage.mkdir()
    hash_dir = ws_storage / "hash2"
    hash_dir.mkdir()
    target_path = Path("/some/project/root")
    (hash_dir / "workspace.json").write_text(
        '{"folder": "file:///some/project/root/"}', encoding="utf-8"
    )
    paths = CursorPaths(
        workspace_storage=ws_storage, global_storage=tmp_path / "global"
    )
    result = find_workspace_storage_hash(target_path, paths)
    assert result == "hash2"


def test_find_workspace_storage_hash_not_found_raises(tmp_path):
    """find_workspace_storage_hash raises ValueError when no match."""
    ws_storage = tmp_path / "workspaceStorage"
    ws_storage.mkdir()
    hash_dir = ws_storage / "other"
    hash_dir.mkdir()
    (hash_dir / "workspace.json").write_text(
        '{"folder": "file:///other/path"}', encoding="utf-8"
    )
    paths = CursorPaths(
        workspace_storage=ws_storage, global_storage=tmp_path / "global"
    )
    with pytest.raises(ValueError, match="Workspace not found"):
        find_workspace_storage_hash(Path("/nonexistent/workspace"), paths)


def test_find_workspace_storage_hash_empty_storage_raises(tmp_path):
    """find_workspace_storage_hash raises when workspaceStorage has no matching dirs."""
    ws_storage = tmp_path / "workspaceStorage"
    ws_storage.mkdir()
    paths = CursorPaths(
        workspace_storage=ws_storage, global_storage=tmp_path / "global"
    )
    with pytest.raises(ValueError, match="Workspace not found"):
        find_workspace_storage_hash(Path("/any/path"), paths)
