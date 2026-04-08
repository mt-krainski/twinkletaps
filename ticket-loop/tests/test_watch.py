"""Tests for the ticket-loop watch command."""

import json

import pytest

from ticket_loop.watch import (
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
    """Resolve task key + sessions file → JSONL path."""

    def test_finds_latest_session(self, tmp_path):
        """Return the JSONL path for the latest matching session."""
        sessions_file = tmp_path / "sessions.jsonl"
        sessions_file.write_text(
            json.dumps(
                {
                    "task_key": "GFD-10",
                    "session_id": "old-id",
                    "phase": "implementation",
                }
            )
            + "\n"
            + json.dumps(
                {
                    "task_key": "GFD-10",
                    "session_id": "new-id",
                    "phase": "implementation",
                }
            )
            + "\n"
        )
        claude_dir = tmp_path / "claude-projects"
        # Create the expected JSONL file
        (claude_dir / "new-id.jsonl").parent.mkdir(parents=True, exist_ok=True)
        (claude_dir / "new-id.jsonl").touch()

        path = resolve_session_jsonl_path(
            "GFD-10", sessions_file=sessions_file, claude_project_dir=claude_dir
        )
        assert path == claude_dir / "new-id.jsonl"

    def test_no_session_raises(self, tmp_path):
        """Raise KeyError when no session matches."""
        sessions_file = tmp_path / "sessions.jsonl"
        sessions_file.write_text(
            json.dumps({"task_key": "GFD-99", "session_id": "abc", "phase": "planning"})
            + "\n"
        )
        claude_dir = tmp_path / "claude-projects"
        claude_dir.mkdir()

        with pytest.raises(KeyError):
            resolve_session_jsonl_path(
                "GFD-1", sessions_file=sessions_file, claude_project_dir=claude_dir
            )

    def test_prefers_implementation_over_planning(self, tmp_path):
        """Implementation phase is preferred when both exist."""
        sessions_file = tmp_path / "sessions.jsonl"
        sessions_file.write_text(
            json.dumps(
                {"task_key": "GFD-5", "session_id": "plan-id", "phase": "planning"}
            )
            + "\n"
            + json.dumps(
                {
                    "task_key": "GFD-5",
                    "session_id": "impl-id",
                    "phase": "implementation",
                }
            )
            + "\n"
        )
        claude_dir = tmp_path / "claude-projects"
        claude_dir.mkdir()
        (claude_dir / "impl-id.jsonl").touch()

        path = resolve_session_jsonl_path(
            "GFD-5", sessions_file=sessions_file, claude_project_dir=claude_dir
        )
        assert path == claude_dir / "impl-id.jsonl"

    def test_falls_back_to_planning(self, tmp_path):
        """Fall back to planning session when no implementation session exists."""
        sessions_file = tmp_path / "sessions.jsonl"
        sessions_file.write_text(
            json.dumps(
                {"task_key": "GFD-5", "session_id": "plan-id", "phase": "planning"}
            )
            + "\n"
        )
        claude_dir = tmp_path / "claude-projects"
        claude_dir.mkdir()
        (claude_dir / "plan-id.jsonl").touch()

        path = resolve_session_jsonl_path(
            "GFD-5", sessions_file=sessions_file, claude_project_dir=claude_dir
        )
        assert path == claude_dir / "plan-id.jsonl"

    def test_falls_back_to_legacy(self, tmp_path):
        """Fall back to legacy (no phase) session."""
        sessions_file = tmp_path / "sessions.jsonl"
        sessions_file.write_text(
            json.dumps({"task_key": "GFD-5", "session_id": "legacy-id"}) + "\n"
        )
        claude_dir = tmp_path / "claude-projects"
        claude_dir.mkdir()
        (claude_dir / "legacy-id.jsonl").touch()

        path = resolve_session_jsonl_path(
            "GFD-5", sessions_file=sessions_file, claude_project_dir=claude_dir
        )
        assert path == claude_dir / "legacy-id.jsonl"


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
        result = parse_jsonl_line(line)
        assert result is not None
        assert result["kind"] == "text"
        assert result["text"] == "I'll start the task."
        assert result["timestamp"] == "2026-04-03T14:46:49.575Z"

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
        result = parse_jsonl_line(line)
        assert result is not None
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
        result = parse_jsonl_line(line)
        assert result is not None
        assert result["kind"] == "tool_result"
        assert result["success"] is True

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
        result = parse_jsonl_line(line)
        assert result is not None
        assert result["kind"] == "tool_result"
        assert result["success"] is False

    def test_queue_operation_ignored(self):
        """Queue operations are not displayed."""
        line = json.dumps(
            {
                "type": "queue-operation",
                "operation": "enqueue",
                "timestamp": "2026-04-03T14:46:46.218Z",
            }
        )
        assert parse_jsonl_line(line) is None

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
        assert parse_jsonl_line(line) is None

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
        assert parse_jsonl_line(line) is None

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
        result = parse_jsonl_line(line)
        assert result["description"] == "Fetch GFD-89 Jira issue"

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
        result = parse_jsonl_line(line)
        assert result["description"] == "/src/components/App.tsx"

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
        result = parse_jsonl_line(line)
        assert result["description"] == "/src/lib/utils.ts"

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
        result = parse_jsonl_line(line)
        assert result["description"] == "useIsMobile"
