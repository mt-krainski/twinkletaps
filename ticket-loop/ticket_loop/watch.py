"""Watch command — tail a Claude Code session and display agent activity."""

import json
import re
import signal
import subprocess
import sys
import threading
from collections.abc import Callable
from dataclasses import dataclass
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
    claude_project_dir: Path,
) -> Path:
    """Resolve a task key to its Claude session JSONL file path.

    Delegates to ``resolve_session`` for the session lookup
    (implementation → planning → legacy), then builds the JSONL path.

    Raises:
        KeyError: If no session matches the task key.
    """
    from ticket_loop.main import Phase, resolve_session

    session_id = resolve_session(task_key, [Phase.IMPLEMENTATION, Phase.PLANNING, None])
    return claude_project_dir / f"{session_id}.jsonl"


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


def _infer_tool_success(data: dict[str, Any], block: dict[str, Any]) -> bool:
    """Infer whether a tool result was successful.

    The toolUseResult field varies by tool type — it can be a dict with
    different keys, or absent entirely. We check multiple signals.
    """
    tur = data.get("toolUseResult")
    if isinstance(tur, dict):
        # Skill results: {"success": bool}
        if "success" in tur:
            return bool(tur["success"])
        # Bash results: check for interrupted or error exit
        if tur.get("interrupted"):
            return False
        # Agent results: {"status": "completed"|...}
        if "status" in tur:
            return tur["status"] == "completed"
        # Bash with no explicit success — assume ok unless is_error
        return not block.get("is_error", False)
    # Fall back to the content block's is_error flag
    return not block.get("is_error", False)


def _truncate_tool_output(block: dict[str, Any], max_len: int = 120) -> str:
    """Extract a truncated preview of tool result content for verbose mode."""
    raw = block.get("content", "")
    if isinstance(raw, list):
        # Content can be a list of text blocks
        parts = [b.get("text", "") for b in raw if isinstance(b, dict)]
        raw = " ".join(parts)
    text = str(raw).replace("\n", " ").strip()
    if len(text) > max_len:
        return text[: max_len - 3] + "..."
    return text


def parse_jsonl_line(line: str) -> list[dict[str, Any]]:
    """Parse a JSONL line into display-friendly dicts.

    Returns a list of event dicts (may be empty). Each has a "kind" field:
      - kind="text": assistant text output (has "text", "timestamp")
      - kind="tool_use": tool call (has "tool_name", "description", "timestamp")
      - kind="tool_result": tool outcome (has "success", "timestamp")
    """
    try:
        data = json.loads(line)
    except (json.JSONDecodeError, ValueError):
        return []

    # Skip queue operations
    if data.get("type") == "queue-operation":
        return []

    # Skip meta messages (skill loading, system reminders)
    if data.get("isMeta"):
        return []

    timestamp = data.get("timestamp", "")
    message = data.get("message", {})
    content = message.get("content")

    if not isinstance(content, list):
        return []

    events: list[dict[str, Any]] = []
    for block in content:
        block_type = block.get("type")

        if block_type == "text" and message.get("role") == "assistant":
            text = block.get("text", "").strip()
            if text:
                events.append({"kind": "text", "text": text, "timestamp": timestamp})

        elif block_type == "tool_use":
            tool_name = block.get("name", "?")
            tool_input = block.get("input", {})
            description = _extract_tool_description(tool_name, tool_input)
            events.append(
                {
                    "kind": "tool_use",
                    "tool_name": tool_name,
                    "description": description,
                    "timestamp": timestamp,
                }
            )

        elif block_type == "tool_result":
            success = _infer_tool_success(data, block)
            evt: dict[str, Any] = {
                "kind": "tool_result",
                "success": success,
                "timestamp": timestamp,
            }
            preview = _truncate_tool_output(block)
            if preview:
                evt["preview"] = preview
            events.append(evt)

    return events


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


def format_event(event: dict[str, Any], *, verbose: bool = False) -> str:
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
        status = "\u2713 ok" if event["success"] else "\u2717 err"
        base = f"{time_str}  {prefix}{status}"
        if verbose and event.get("preview"):
            return f"{base} — {event['preview']}"
        return base

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
    def _infer_subagent_dir(jsonl_path: Path) -> Path:
        """Derive the subagents directory from the session JSONL path."""
        # Session JSONL: <dir>/<session-id>.jsonl
        # Subagents:     <dir>/<session-id>/subagents/
        session_id = jsonl_path.stem
        return jsonl_path.parent / session_id / "subagents"

    def catchup_events(self) -> list[dict[str, Any]]:
        """Read the JSONL and return the last N meaningful events."""
        all_lines = self._main.read_all_lines()
        events: list[dict[str, Any]] = []
        for raw in all_lines:
            events.extend(parse_jsonl_line(raw))

        # Also read any existing subagent files
        self._discover_subagents()
        for tail in self._subagent_tails.values():
            for raw in tail.read_all_lines():
                for evt in parse_jsonl_line(raw):
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
            events.extend(parse_jsonl_line(raw))

        for tail in self._subagent_tails.values():
            for raw in tail.read_new_lines():
                for evt in parse_jsonl_line(raw):
                    evt["agent_id"] = tail.agent_id
                    events.append(evt)

        events.sort(key=lambda e: e.get("timestamp", ""))
        return events

    def _discover_subagents(self) -> None:
        """Scan for new subagent JSONL files."""
        if not self._subagent_dir.is_dir():
            return
        for p in self._subagent_dir.glob("agent-*.jsonl"):
            if p.name not in self._subagent_tails:
                agent_id = p.stem  # e.g. "agent-a5c725bb8b43"
                self._subagent_tails[p.name] = _FileTail(p, agent_id=agent_id)


@dataclass
class BranchChange:
    """Result of a detected branch change."""

    branch: str
    task_key: str | None


class BranchTracker:
    """Detect git branch changes by polling."""

    def __init__(self, *, get_branch: Callable[[], str] | None = None) -> None:
        """Create a tracker. Accepts an optional get_branch callable for testing."""
        self._get_branch = get_branch or _get_current_branch
        self._last_branch: str | None = None

    def check(self) -> BranchChange | None:
        """Check the current branch. Returns BranchChange if changed, None otherwise."""
        try:
            branch = self._get_branch()
        except (subprocess.CalledProcessError, OSError):
            return None

        if branch == self._last_branch:
            return None

        self._last_branch = branch
        task_key = resolve_task_key_from_branch(branch)
        return BranchChange(branch=branch, task_key=task_key)


# -- Default paths --


def _claude_project_dir() -> Path:
    """Derive the Claude project directory for this repo."""
    from ticket_loop.main import REPO_ROOT

    # Claude encodes project paths by replacing / with -
    encoded = str(REPO_ROOT).replace("/", "-")
    return Path.home() / ".claude" / "projects" / encoded


_POLL_INTERVAL = 0.5  # seconds


def _get_current_branch() -> str:
    """Get the current git branch name."""
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],  # noqa: S603, S607
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def _try_resolve_session(task_key: str) -> Path | None:
    """Try to resolve a session JSONL path, returning None on failure."""
    try:
        path = resolve_session_jsonl_path(
            task_key, claude_project_dir=_claude_project_dir()
        )
    except KeyError:
        return None
    return path if path.exists() else None


def _start_tailing(
    task_key: str,
    jsonl_path: Path,
    *,
    verbose: bool,
    catchup: int,
) -> SessionTailer:
    """Print header, show catch-up, and return a new SessionTailer."""
    print(f"\n=== Watching {task_key} — {jsonl_path.name} ===\n")
    tailer = SessionTailer(jsonl_path, catchup=catchup)
    for evt in tailer.catchup_events():
        print(format_event(evt, verbose=verbose))
    if catchup > 0:
        print("--- live ---")
    return tailer


def run_watch(
    *,
    task_key_override: str | None = None,
    verbose: bool = False,
    catchup: int = 10,
) -> None:
    """Main entry point for the watch command."""
    print("Press Ctrl+C to stop.")

    # Set up graceful shutdown
    shutdown = threading.Event()

    def _handle_signal(signum: int, _frame: Any) -> None:
        shutdown.set()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    tracking = task_key_override is None
    tailer: SessionTailer | None = None
    current_task: str | None = None
    tracker = BranchTracker() if tracking else None

    # Initial resolution
    if task_key_override:
        path = _try_resolve_session(task_key_override)
        if path is None:
            print(f"Error: no session found for {task_key_override}")
            sys.exit(1)
        current_task = task_key_override
        tailer = _start_tailing(current_task, path, verbose=verbose, catchup=catchup)

    # Poll loop
    while not shutdown.is_set():
        tailer, current_task = _poll_once(
            tracker=tracker,
            tailer=tailer,
            current_task=current_task,
            verbose=verbose,
            catchup=catchup,
        )
        shutdown.wait(_POLL_INTERVAL)

    print("\nStopped.")


def _handle_branch_change(
    change: BranchChange,
    current_task: str | None,
    *,
    verbose: bool,
    catchup: int,
) -> tuple[SessionTailer | None, str | None]:
    """Handle a detected branch change. Returns (tailer, task_key)."""
    if change.task_key is None:
        if current_task is not None:
            print(f"\n=== On {change.branch} (not a task branch) ===")
        return None, None

    path = _try_resolve_session(change.task_key)
    if path is not None:
        tailer = _start_tailing(change.task_key, path, verbose=verbose, catchup=catchup)
        return tailer, change.task_key

    print(f"\n=== {change.task_key} — waiting for session... ===")
    return None, change.task_key


def _poll_once(
    *,
    tracker: BranchTracker | None,
    tailer: SessionTailer | None,
    current_task: str | None,
    verbose: bool,
    catchup: int,
) -> tuple[SessionTailer | None, str | None]:
    """Run one iteration of the poll loop. Returns (tailer, current_task)."""
    # Branch tracking
    if tracker is not None:
        change = tracker.check()
        if change is not None:
            return _handle_branch_change(
                change, current_task, verbose=verbose, catchup=catchup
            )

    # Retry session resolution for a task that had no session yet
    if tailer is None and current_task is not None:
        path = _try_resolve_session(current_task)
        if path is not None:
            tailer = _start_tailing(
                current_task, path, verbose=verbose, catchup=catchup
            )

    # Poll active tailer
    if tailer is not None:
        for evt in tailer.poll():
            print(format_event(evt, verbose=verbose))

    return tailer, current_task
