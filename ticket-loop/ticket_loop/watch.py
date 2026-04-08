"""Watch command — tail a Claude Code session and display agent activity."""

import json
import re
from datetime import datetime
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


_MAX_TEXT_LEN = 200


def _format_time(timestamp: str) -> str:
    """Extract HH:MM:SS from an ISO timestamp."""
    if not timestamp:
        return "??:??:??"
    try:
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        local_dt = dt.astimezone()
        return local_dt.strftime("%H:%M:%S")
    except (ValueError, TypeError):
        return "??:??:??"


def _format_agent_prefix(agent_id: str | None) -> str:
    """Format a short agent prefix from an agent ID like 'agent-a5c725bb8b43'."""
    if not agent_id:
        return ""
    # Extract first 4 hex chars after 'agent-'
    short = agent_id.replace("agent-", "")[:4]
    return f"[{short}] "


def format_event(event: dict[str, Any]) -> str:
    """Format a parsed event into a single display line."""
    time_str = _format_time(event.get("timestamp", ""))
    prefix = _format_agent_prefix(event.get("agent_id"))
    kind = event["kind"]

    if kind == "text":
        text = event["text"]
        if len(text) > _MAX_TEXT_LEN:
            text = text[: _MAX_TEXT_LEN - 3] + "..."
        return f"{time_str}  {prefix}{text}"

    if kind == "tool_use":
        name = event["tool_name"]
        desc = event.get("description", "")
        if desc:
            return f"{time_str}  {prefix}\u2699 {name}: {desc}"
        return f"{time_str}  {prefix}\u2699 {name}"

    if kind == "tool_result":
        if event["success"]:
            return f"{time_str}  {prefix}\u2713 ok"
        return f"{time_str}  {prefix}\u2717 err"

    return f"{time_str}  {prefix}({kind})"


class _FileTail:
    """Track a single file's read position for incremental reads."""

    def __init__(self, path: Path, *, agent_id: str | None = None) -> None:
        self.path = path
        self.agent_id = agent_id
        self._offset = 0

    def read_new_lines(self) -> list[str]:
        """Read lines appended since the last read."""
        if not self.path.exists():
            return []
        with open(self.path) as f:
            f.seek(self._offset)
            data = f.read()
            self._offset = f.tell()
        lines = data.splitlines()
        return [ln for ln in lines if ln.strip()]

    def read_all_lines(self) -> list[str]:
        """Read all lines and advance the offset to the end."""
        if not self.path.exists():
            return []
        with open(self.path) as f:
            data = f.read()
            self._offset = f.tell()
        lines = data.splitlines()
        return [ln for ln in lines if ln.strip()]


class SessionTailer:
    """Tail a Claude Code session JSONL file plus its subagent files."""

    def __init__(self, jsonl_path: Path, *, catchup: int = 10) -> None:
        """Create a tailer for the given session JSONL path."""
        self._main = _FileTail(jsonl_path)
        self._catchup_count = catchup
        self._subagent_dir = self._infer_subagent_dir(jsonl_path)
        self._subagent_tails: dict[str, _FileTail] = {}

    @staticmethod
    def _infer_subagent_dir(jsonl_path: Path) -> Path | None:
        """Derive the subagents directory from the session JSONL path."""
        # Session JSONL: <dir>/<session-id>.jsonl
        # Subagents:     <dir>/<session-id>/subagents/
        session_id = jsonl_path.stem
        sub_dir = jsonl_path.parent / session_id / "subagents"
        return sub_dir if sub_dir.is_dir() else sub_dir

    def catchup_events(self) -> list[dict[str, Any]]:
        """Read the JSONL and return the last N meaningful events."""
        all_lines = self._main.read_all_lines()
        events: list[dict[str, Any]] = []
        for raw in all_lines:
            evt = parse_jsonl_line(raw)
            if evt is not None:
                events.append(evt)

        # Also read any existing subagent files
        self._discover_subagents()
        for tail in self._subagent_tails.values():
            for raw in tail.read_all_lines():
                evt = parse_jsonl_line(raw)
                if evt is not None:
                    evt["agent_id"] = tail.agent_id
                    events.append(evt)

        # Sort by timestamp and return last N
        events.sort(key=lambda e: e.get("timestamp", ""))
        return events[-self._catchup_count :]

    def poll(self) -> list[dict[str, Any]]:
        """Read new lines from main and subagent files."""
        self._discover_subagents()
        events: list[dict[str, Any]] = []

        for raw in self._main.read_new_lines():
            evt = parse_jsonl_line(raw)
            if evt is not None:
                events.append(evt)

        for tail in self._subagent_tails.values():
            for raw in tail.read_new_lines():
                evt = parse_jsonl_line(raw)
                if evt is not None:
                    evt["agent_id"] = tail.agent_id
                    events.append(evt)

        events.sort(key=lambda e: e.get("timestamp", ""))
        return events

    def _discover_subagents(self) -> None:
        """Scan for new subagent JSONL files."""
        if self._subagent_dir is None:
            return
        if not self._subagent_dir.is_dir():
            return
        for p in self._subagent_dir.glob("agent-*.jsonl"):
            if p.name not in self._subagent_tails:
                agent_id = p.stem  # e.g. "agent-a5c725bb8b43"
                self._subagent_tails[p.name] = _FileTail(p, agent_id=agent_id)
