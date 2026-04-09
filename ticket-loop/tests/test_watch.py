"""Tests for the ticket-loop watch command."""

import json
import subprocess
from unittest.mock import patch

import pytest

from ticket_loop.watch import (
    BranchTracker,
    SessionTailer,
    format_event,
    parse_jsonl_line,
    resolve_session_jsonl_path,
    resolve_task_key_from_branch,
)


class TestResolveTaskKeyFromBranch:
    """Extract Jira task key from a git branch name."""

    def test_standard_branch(self):
        """Parse task/GFD-119/watch-command."""
        assert resolve_task_key_from_branch("task/GFD-119/watch-command") == "GFD-119"

    def test_planning_branch(self):
        """Parse task/GFD-42/some-slug."""
        assert resolve_task_key_from_branch("task/GFD-42/some-slug") == "GFD-42"

    def test_no_match_returns_none(self):
        """Non-task branches return None."""
        assert resolve_task_key_from_branch("main") is None
        assert resolve_task_key_from_branch("feature/something") is None

    def test_bare_task_prefix(self):
        """Branches without a slug still match."""
        assert resolve_task_key_from_branch("task/GFD-7/") == "GFD-7"


class TestResolveSessionJsonlPath:
    """Resolve task key → JSONL path via resolve_session."""

    @patch("ticket_loop.main.resolve_session", return_value="abc-123")
    def test_builds_jsonl_path(self, _mock, tmp_path):
        """Combines session_id from resolve_session with claude_project_dir."""
        path = resolve_session_jsonl_path("GFD-10", claude_project_dir=tmp_path)
        assert path == tmp_path / "abc-123.jsonl"

    @patch(
        "ticket_loop.main.resolve_session",
        side_effect=KeyError("No session found for GFD-1"),
    )
    def test_propagates_key_error(self, _mock, tmp_path):
        """KeyError from resolve_session propagates."""
        with pytest.raises(KeyError):
            resolve_session_jsonl_path("GFD-1", claude_project_dir=tmp_path)


class TestParseJsonlLine:
    """Parse a JSONL line into a display-friendly structure."""

    def test_assistant_text(self):
        """Extract text from an assistant message."""
        line = json.dumps(
            {
                "type": "assistant",
                "timestamp": "2026-04-03T14:46:49.575Z",
                "message": {
                    "role": "assistant",
                    "content": [{"type": "text", "text": "I'll start the task."}],
                },
            }
        )
        results = parse_jsonl_line(line)
        assert len(results) == 1
        assert results[0]["kind"] == "text"
        assert results[0]["text"] == "I'll start the task."
        assert results[0]["timestamp"] == "2026-04-03T14:46:49.575Z"

    def test_tool_use(self):
        """Extract tool call info."""
        line = json.dumps(
            {
                "type": "assistant",
                "timestamp": "2026-04-03T14:46:54.097Z",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Bash",
                            "input": {
                                "command": "git status",
                                "description": "Check git status",
                            },
                        }
                    ],
                },
            }
        )
        results = parse_jsonl_line(line)
        assert len(results) == 1
        result = results[0]
        assert result["kind"] == "tool_use"
        assert result["tool_name"] == "Bash"
        assert result["description"] == "Check git status"

    def test_tool_result_success(self):
        """Extract success/error from tool result."""
        line = json.dumps(
            {
                "type": "user",
                "timestamp": "2026-04-03T14:46:56.630Z",
                "message": {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": "toolu_123",
                            "content": "some output",
                            "is_error": False,
                        }
                    ],
                },
                "toolUseResult": {"success": True},
            }
        )
        results = parse_jsonl_line(line)
        assert len(results) == 1
        assert results[0]["kind"] == "tool_result"
        assert results[0]["success"] is True

    def test_tool_result_error(self):
        """Detect errored tool results."""
        line = json.dumps(
            {
                "type": "user",
                "timestamp": "2026-04-03T14:47:00.000Z",
                "message": {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": "toolu_456",
                            "content": "error: file not found",
                            "is_error": True,
                        }
                    ],
                },
                "toolUseResult": {"success": False},
            }
        )
        results = parse_jsonl_line(line)
        assert len(results) == 1
        assert results[0]["kind"] == "tool_result"
        assert results[0]["success"] is False

    def test_tool_result_bash_format(self):
        """Bash tool results use stdout/stderr format, no explicit success."""
        line = json.dumps(
            {
                "type": "user",
                "timestamp": "2026-04-03T14:47:00.000Z",
                "message": {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": "toolu_789",
                            "content": "branch main",
                            "is_error": False,
                        }
                    ],
                },
                "toolUseResult": {
                    "stdout": "branch main",
                    "stderr": "",
                    "interrupted": False,
                    "isImage": False,
                },
            }
        )
        results = parse_jsonl_line(line)
        assert results[0]["success"] is True

    def test_tool_result_agent_format(self):
        """Agent tool results use status field."""
        line = json.dumps(
            {
                "type": "user",
                "timestamp": "2026-04-03T14:47:00.000Z",
                "message": {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": "toolu_abc",
                            "content": [{"type": "text", "text": "result"}],
                        }
                    ],
                },
                "toolUseResult": {
                    "status": "completed",
                    "prompt": "do something",
                    "agentId": "a123",
                },
            }
        )
        results = parse_jsonl_line(line)
        assert results[0]["success"] is True

    def test_tool_result_string_tool_use_result(self):
        """Handle cases where toolUseResult is a string."""
        line = json.dumps(
            {
                "type": "user",
                "timestamp": "2026-04-03T14:47:00.000Z",
                "message": {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": "toolu_str",
                            "content": "ok",
                            "is_error": False,
                        }
                    ],
                },
                "toolUseResult": "some string value",
            }
        )
        results = parse_jsonl_line(line)
        assert results[0]["success"] is True

    def test_queue_operation_ignored(self):
        """Queue operations are not displayed."""
        line = json.dumps(
            {
                "type": "queue-operation",
                "operation": "enqueue",
                "timestamp": "2026-04-03T14:46:46.218Z",
            }
        )
        assert parse_jsonl_line(line) == []

    def test_meta_message_ignored(self):
        """Meta/system messages (skill loading etc.) are not displayed."""
        line = json.dumps(
            {
                "type": "user",
                "isMeta": True,
                "timestamp": "2026-04-03T14:46:49.772Z",
                "message": {
                    "role": "user",
                    "content": [{"type": "text", "text": "skill content..."}],
                },
            }
        )
        assert parse_jsonl_line(line) == []

    def test_empty_text_ignored(self):
        """Assistant messages with only whitespace text are skipped."""
        line = json.dumps(
            {
                "type": "assistant",
                "timestamp": "2026-04-03T14:46:49.575Z",
                "message": {
                    "role": "assistant",
                    "content": [{"type": "text", "text": "\n\n"}],
                },
            }
        )
        assert parse_jsonl_line(line) == []

    def test_bash_tool_uses_description(self):
        """Bash tool calls prefer the description field for display."""
        line = json.dumps(
            {
                "type": "assistant",
                "timestamp": "2026-04-03T14:47:03.382Z",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Bash",
                            "input": {
                                "command": (
                                    "jira-utils get-issue"
                                    " --issue-key GFD-89"
                                    " --fields '*all' --pretty"
                                ),
                                "description": "Fetch GFD-89 Jira issue",
                            },
                        }
                    ],
                },
            }
        )
        results = parse_jsonl_line(line)
        assert results[0]["description"] == "Fetch GFD-89 Jira issue"

    def test_read_tool_shows_file_path(self):
        """Read tool calls show the file_path."""
        line = json.dumps(
            {
                "type": "assistant",
                "timestamp": "2026-04-03T14:47:03.382Z",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Read",
                            "input": {"file_path": "/src/components/App.tsx"},
                        }
                    ],
                },
            }
        )
        results = parse_jsonl_line(line)
        assert results[0]["description"] == "/src/components/App.tsx"

    def test_edit_tool_shows_file_path(self):
        """Edit tool calls show the file_path."""
        line = json.dumps(
            {
                "type": "assistant",
                "timestamp": "2026-04-03T14:47:03.382Z",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Edit",
                            "input": {
                                "file_path": "/src/lib/utils.ts",
                                "old_string": "foo",
                                "new_string": "bar",
                            },
                        }
                    ],
                },
            }
        )
        results = parse_jsonl_line(line)
        assert results[0]["description"] == "/src/lib/utils.ts"

    def test_grep_tool_shows_pattern(self):
        """Grep tool calls show the search pattern."""
        line = json.dumps(
            {
                "type": "assistant",
                "timestamp": "2026-04-03T14:47:03.382Z",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Grep",
                            "input": {"pattern": "useIsMobile", "glob": "**/*.tsx"},
                        }
                    ],
                },
            }
        )
        results = parse_jsonl_line(line)
        assert results[0]["description"] == "useIsMobile"

    def test_multi_block_message(self):
        """Messages with text + tool_use return multiple events."""
        line = json.dumps(
            {
                "type": "assistant",
                "timestamp": "2026-04-03T14:47:03.382Z",
                "message": {
                    "role": "assistant",
                    "content": [
                        {"type": "text", "text": "Let me check."},
                        {
                            "type": "tool_use",
                            "name": "Bash",
                            "input": {"command": "ls"},
                        },
                    ],
                },
            }
        )
        results = parse_jsonl_line(line)
        assert len(results) == 2
        assert results[0]["kind"] == "text"
        assert results[1]["kind"] == "tool_use"

    def test_malformed_json_returns_empty(self):
        """Partial or invalid JSON returns empty list."""
        assert parse_jsonl_line("{broken") == []
        assert parse_jsonl_line("") == []

    def test_tool_result_has_preview(self):
        """Tool results include a preview of the output."""
        line = json.dumps(
            {
                "type": "user",
                "timestamp": "2026-04-03T14:47:00.000Z",
                "message": {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": "toolu_x",
                            "content": "Hello world output",
                            "is_error": False,
                        }
                    ],
                },
                "toolUseResult": {"success": True},
            }
        )
        results = parse_jsonl_line(line)
        assert results[0]["preview"] == "Hello world output"


def _has_time_prefix(s: str) -> bool:
    """Check that a string starts with HH:MM:SS format."""
    import re

    return bool(re.match(r"\d{2}:\d{2}:\d{2}", s))


class TestFormatEvent:
    """Format parsed events into display strings."""

    def test_text_event(self):
        """Text events show timestamp and text."""
        event = {
            "kind": "text",
            "text": "Starting implementation.",
            "timestamp": "2026-04-03T14:46:49.575Z",
        }
        result = format_event(event)
        assert _has_time_prefix(result)
        assert "Starting implementation." in result

    def test_tool_use_event(self):
        """Tool use events show gear icon and tool name."""
        event = {
            "kind": "tool_use",
            "tool_name": "Bash",
            "description": "Run git status",
            "timestamp": "2026-04-03T14:46:54.097Z",
        }
        result = format_event(event)
        assert _has_time_prefix(result)
        assert "Bash" in result
        assert "Run git status" in result

    def test_tool_result_success(self):
        """Successful tool results show a check mark."""
        event = {
            "kind": "tool_result",
            "success": True,
            "timestamp": "2026-04-03T14:46:56.630Z",
        }
        result = format_event(event)
        assert "ok" in result.lower() or "\u2713" in result

    def test_tool_result_error(self):
        """Failed tool results show an error indicator."""
        event = {
            "kind": "tool_result",
            "success": False,
            "timestamp": "2026-04-03T14:47:00.000Z",
        }
        result = format_event(event)
        assert "err" in result.lower() or "\u2717" in result

    def test_agent_prefix(self):
        """Events with an agent_id include an agent prefix."""
        event = {
            "kind": "text",
            "text": "Searching codebase.",
            "timestamp": "2026-04-03T14:47:15.000Z",
            "agent_id": "agent-a5c725bb8b43",
        }
        result = format_event(event)
        assert "[a5c7]" in result

    def test_long_text_truncated(self):
        """Very long text is truncated in output."""
        event = {
            "kind": "text",
            "text": "A" * 300,
            "timestamp": "2026-04-03T14:47:15.000Z",
        }
        result = format_event(event)
        assert "..." in result
        assert len(result) < 300

    def test_verbose_tool_result_shows_preview(self):
        """Verbose mode includes tool result preview."""
        event = {
            "kind": "tool_result",
            "success": True,
            "timestamp": "2026-04-03T14:46:56.630Z",
            "preview": "branch main",
        }
        result = format_event(event, verbose=True)
        assert "branch main" in result
        assert "\u2713 ok" in result

    def test_non_verbose_hides_preview(self):
        """Default mode omits tool result preview."""
        event = {
            "kind": "tool_result",
            "success": True,
            "timestamp": "2026-04-03T14:46:56.630Z",
            "preview": "branch main",
        }
        result = format_event(event, verbose=False)
        assert "branch main" not in result


def _write_jsonl(path, records):
    """Write a list of dicts as JSONL lines."""
    with open(path, "w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")


def _assistant_text(text, ts="2026-04-03T14:46:49.575Z"):
    """Build an assistant text JSONL record."""
    return {
        "type": "assistant",
        "timestamp": ts,
        "message": {
            "role": "assistant",
            "content": [{"type": "text", "text": text}],
        },
    }


def _tool_use(name, inp, ts="2026-04-03T14:46:50.000Z"):
    """Build a tool_use JSONL record."""
    return {
        "type": "assistant",
        "timestamp": ts,
        "message": {
            "role": "assistant",
            "content": [{"type": "tool_use", "name": name, "input": inp}],
        },
    }


def _tool_result(success=True, ts="2026-04-03T14:46:51.000Z"):
    """Build a tool_result JSONL record."""
    return {
        "type": "user",
        "timestamp": ts,
        "message": {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": "toolu_x",
                    "content": "output",
                    "is_error": not success,
                }
            ],
        },
        "toolUseResult": {"success": success},
    }


class TestSessionTailer:
    """Test the SessionTailer that reads and tails JSONL files."""

    def test_catchup_returns_last_n_events(self, tmp_path):
        """Catch-up reads the last N meaningful events."""
        jsonl = tmp_path / "session.jsonl"
        records = [_assistant_text(f"msg {i}") for i in range(20)]
        _write_jsonl(jsonl, records)

        tailer = SessionTailer(jsonl, catchup=5)
        events = tailer.catchup_events()
        assert len(events) == 5
        assert events[-1]["text"] == "msg 19"
        assert events[0]["text"] == "msg 15"

    def test_catchup_skips_non_displayable(self, tmp_path):
        """Catch-up skips queue operations and meta messages."""
        jsonl = tmp_path / "session.jsonl"
        records = [
            {
                "type": "queue-operation",
                "operation": "enqueue",
                "timestamp": "2026-04-03T14:46:46.218Z",
            },
            _assistant_text("visible 1"),
            {
                "type": "user",
                "isMeta": True,
                "timestamp": "2026-04-03T14:46:47.000Z",
                "message": {
                    "role": "user",
                    "content": [{"type": "text", "text": "meta"}],
                },
            },
            _assistant_text("visible 2"),
        ]
        _write_jsonl(jsonl, records)

        tailer = SessionTailer(jsonl, catchup=10)
        events = tailer.catchup_events()
        assert len(events) == 2
        assert events[0]["text"] == "visible 1"
        assert events[1]["text"] == "visible 2"

    def test_poll_returns_new_lines(self, tmp_path):
        """After catchup, poll picks up newly appended lines."""
        jsonl = tmp_path / "session.jsonl"
        _write_jsonl(jsonl, [_assistant_text("initial")])

        tailer = SessionTailer(jsonl, catchup=10)
        tailer.catchup_events()

        # Append a new line
        with open(jsonl, "a") as f:
            f.write(json.dumps(_assistant_text("new msg")) + "\n")

        events = tailer.poll()
        assert len(events) == 1
        assert events[0]["text"] == "new msg"

    def test_poll_returns_empty_when_no_new_data(self, tmp_path):
        """Poll returns empty list when nothing new."""
        jsonl = tmp_path / "session.jsonl"
        _write_jsonl(jsonl, [_assistant_text("msg")])

        tailer = SessionTailer(jsonl, catchup=10)
        tailer.catchup_events()

        events = tailer.poll()
        assert events == []

    def test_discovers_subagent_files(self, tmp_path):
        """Tailer discovers and tails subagent JSONL files."""
        session_id = "abc-123"
        jsonl = tmp_path / f"{session_id}.jsonl"
        _write_jsonl(jsonl, [_assistant_text("main msg")])

        # Create subagent directory and file
        sub_dir = tmp_path / session_id / "subagents"
        sub_dir.mkdir(parents=True)
        sub_file = sub_dir / "agent-a5c725bb8b43.jsonl"
        _write_jsonl(sub_file, [_assistant_text("sub msg")])

        tailer = SessionTailer(jsonl, catchup=10)
        tailer.catchup_events()

        # Append to subagent
        with open(sub_file, "a") as f:
            f.write(json.dumps(_assistant_text("sub new")) + "\n")

        events = tailer.poll()
        assert len(events) == 1
        assert events[0]["text"] == "sub new"
        assert events[0].get("agent_id") == "agent-a5c725bb8b43"


class TestBranchTracker:
    """Track branch changes and resolve sessions."""

    def test_reports_initial_branch(self):
        """First call to check() returns the branch as changed."""
        tracker = BranchTracker(get_branch=lambda: "task/GFD-42/slug")
        result = tracker.check()
        assert result is not None
        assert result.task_key == "GFD-42"
        assert result.branch == "task/GFD-42/slug"

    def test_no_change_returns_none(self):
        """Subsequent calls return None when branch hasn't changed."""
        tracker = BranchTracker(get_branch=lambda: "task/GFD-42/slug")
        tracker.check()
        assert tracker.check() is None

    def test_detects_branch_switch(self):
        """Returns new info when branch changes."""
        branches = iter(["task/GFD-42/slug", "task/GFD-42/slug", "task/GFD-99/other"])
        tracker = BranchTracker(get_branch=lambda: next(branches))
        tracker.check()  # initial
        assert tracker.check() is None  # same
        result = tracker.check()  # changed
        assert result is not None
        assert result.task_key == "GFD-99"

    def test_non_task_branch_returns_no_task_key(self):
        """Non-task branches (main, feature/*) have task_key=None."""
        tracker = BranchTracker(get_branch=lambda: "main")
        result = tracker.check()
        assert result is not None
        assert result.task_key is None
        assert result.branch == "main"

    def test_switch_to_non_task_branch(self):
        """Switching from a task branch to main is detected."""
        branches = iter(["task/GFD-42/slug", "main"])
        tracker = BranchTracker(get_branch=lambda: next(branches))
        tracker.check()  # initial
        result = tracker.check()  # switch to main
        assert result is not None
        assert result.task_key is None

    def test_git_failure_returns_none(self):
        """If get_branch raises, check() returns None (no crash)."""

        def failing_branch():
            raise subprocess.CalledProcessError(1, "git")

        tracker = BranchTracker(get_branch=failing_branch)
        assert tracker.check() is None
