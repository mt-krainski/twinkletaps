"""Resolve Cursor workspace storage path from a project path."""

import json
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote, urlparse


@dataclass
class CursorPaths:
    """Paths to Cursor's global and workspace storage (macOS defaults)."""

    global_storage: Path
    workspace_storage: Path

    def __init__(
        self,
        global_storage: Path | None = None,
        workspace_storage: Path | None = None,
    ) -> None:
        """Initialize paths; use macOS Cursor defaults when arguments are None."""
        default_base = Path.home() / "Library/Application Support/Cursor/User"
        self.global_storage = global_storage or default_base / "globalStorage"
        self.workspace_storage = workspace_storage or default_base / "workspaceStorage"


def _normalize_folder_uri(uri: str) -> Path:
    """Return absolute Path from a file:// URI."""
    parsed = urlparse(uri)
    if parsed.scheme != "file":
        raise ValueError(f"Expected file URI, got {uri}")
    path = unquote(parsed.path)
    return Path(path).resolve()


def find_workspace_storage_hash(workspace_path: Path, paths: CursorPaths) -> str:
    """Find the workspace storage hash directory for the given workspace path.

    Iterates over workspaceStorage subdirs, reads workspace.json folder URI,
    and returns the hash (subdir name) when it matches workspace_path.

    Args:
        workspace_path: The project root path to look up.
        paths: CursorPaths with workspace_storage pointing at workspaceStorage dir.

    Returns:
        The storage hash (subdirectory name) for that workspace.

    Raises:
        ValueError: When no workspace.json folder matches the given path.
    """
    target = workspace_path.resolve()
    if not paths.workspace_storage.is_dir():
        raise ValueError("Workspace not found: no workspaceStorage directory")

    for entry in paths.workspace_storage.iterdir():
        if not entry.is_dir():
            continue
        workspace_json = entry / "workspace.json"
        if not workspace_json.is_file():
            continue
        try:
            raw = workspace_json.read_text(encoding="utf-8")
            data = json.loads(raw)
            folder_uri = data.get("folder")
            if not folder_uri:
                continue
            resolved = _normalize_folder_uri(folder_uri)
            if resolved == target:
                return entry.name
        except (ValueError, OSError):
            continue

    raise ValueError("Workspace not found: no matching workspace.json folder")
