"""Watch command — tail a Claude Code session and display agent activity."""

import json
import re
from pathlib import Path
from typing import Any

# Branch pattern: task/GFD-###/<optional-slug>
_BRANCH_RE = re.compile(r"^task/(GFD-\d+)/")

# Tool description extractors — keyed by tool name, returns a short summary
_TOOL_DESCRIPTION_EXTRACTORS: dict[str, list[str]] = {
    "Bash": ["description", "command"],
    "Read": ["file_path"],
    "Edit": ["file_path"],
    "Write": ["file_path"],
    "Grep": ["pattern"],
    "Glob": ["pattern"],
    "Skill": ["skill"],
    "Agent": ["description"],
}


def resolve_task_key_from_branch(branch: str) -> str | None:
    """Extract the Jira task key from a branch name, or None if not a task branch."""
    m = _BRANCH_RE.match(branch)
    return m.group(1) if m else None


def resolve_session_jsonl_path(
    task_key: str,
    *,
    sessions_file: Path,
    claude_project_dir: Path,
) -> Path:
    """Resolve a task key to its Claude session JSONL file path.

    Tries implementation phase first, then planning, then legacy (no phase).

    Raises:
        KeyError: If no session matches the task key.
    """
    if not sessions_file.exists():
        raise KeyError(f"Sessions file not found: {sessions_file}")

    # Collect all sessions for this task, grouped by phase
    by_phase: dict[str | None, str] = {}
    with open(sessions_file) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            if record["task_key"] == task_key:
                phase = record.get("phase")
                by_phase[phase] = record["session_id"]

    # Prefer implementation → planning → legacy
    for phase in ("implementation", "planning", None):
        if phase in by_phase:
            session_id = by_phase[phase]
            return claude_project_dir / f"{session_id}.jsonl"

    raise KeyError(f"No session found for {task_key}")


def _extract_tool_description(tool_name: str, tool_input: dict[str, Any]) -> str:
    """Extract a short description from a tool_use input."""
    keys = _TOOL_DESCRIPTION_EXTRACTORS.get(tool_name, [])
    for key in keys:
        if key in tool_input and tool_input[key]:
            value = str(tool_input[key])
            # Truncate long values
            if len(value) > 120:
                return value[:117] + "..."
            return value
    # Fallback: show first key's value
    for v in tool_input.values():
        s = str(v)
        if len(s) > 80:
            return s[:77] + "..."
        return s
    return ""


def parse_jsonl_line(line: str) -> dict[str, Any] | None:
    """Parse a JSONL line into a display-friendly dict, or None to skip.

    Returns dicts with a "kind" field:
      - kind="text": assistant text output (has "text", "timestamp")
      - kind="tool_use": tool call (has "tool_name", "description", "timestamp")
      - kind="tool_result": tool outcome (has "success", "timestamp")
    """
    data = json.loads(line)

    # Skip queue operations
    if data.get("type") == "queue-operation":
        return None

    # Skip meta messages (skill loading, system reminders)
    if data.get("isMeta"):
        return None

    timestamp = data.get("timestamp", "")
    message = data.get("message", {})
    content = message.get("content")

    if not isinstance(content, list):
        return None

    for block in content:
        block_type = block.get("type")

        if block_type == "text" and message.get("role") == "assistant":
            text = block.get("text", "").strip()
            if not text:
                return None
            return {"kind": "text", "text": text, "timestamp": timestamp}

        if block_type == "tool_use":
            tool_name = block.get("name", "?")
            tool_input = block.get("input", {})
            description = _extract_tool_description(tool_name, tool_input)
            return {
                "kind": "tool_use",
                "tool_name": tool_name,
                "description": description,
                "timestamp": timestamp,
            }

        if block_type == "tool_result":
            # Check toolUseResult first (structured), fall back to is_error
            tool_use_result = data.get("toolUseResult")
            if tool_use_result is not None:
                success = tool_use_result.get("success", True)
            else:
                success = not block.get("is_error", False)
            return {
                "kind": "tool_result",
                "success": success,
                "timestamp": timestamp,
            }

    return None
