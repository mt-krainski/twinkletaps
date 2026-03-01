"""Lightweight tests for ticket_loop — pure logic and basic I/O only."""

import json

import pytest

from ticket_loop.main import (
    _is_wip_blocked,
    find_agent_task,
    get_session,
    save_session,
)


def _task(key: str, assignee: str | None = "Bot") -> dict:
    return {"key": key, "summary": f"Task {key}", "assignee": assignee}


BOARD = {
    "review": [_task("GFD-1"), _task("GFD-2", "matt")],
    "in_progress": [_task("GFD-3")],
    "to_do": [_task("GFD-4", "matt"), _task("GFD-5")],
    "planning": [_task("GFD-6")],
}


# -- import smoke test --


def test_module_imports():
    """Catch syntax errors and broken imports."""
    import ticket_loop.main  # noqa: F401


# -- find_agent_task --


def test_find_agent_task_priority_order():
    """Review tasks are picked before planning/to_do."""
    result = find_agent_task(BOARD, "Bot")
    assert result is not None
    column, task = result
    assert column == "review"
    assert task["key"] == "GFD-1"


def test_find_agent_task_skips_in_progress():
    """In-progress column is ignored; next eligible column is used."""
    board = {"in_progress": [_task("GFD-10")], "to_do": [_task("GFD-11")]}
    result = find_agent_task(board, "Bot")
    assert result is not None
    assert result[0] == "to_do"


def test_find_agent_task_no_match():
    """Returns None when no tasks match the agent username."""
    board = {"to_do": [_task("GFD-1", "matt")]}
    assert find_agent_task(board, "Bot") is None


def test_find_agent_task_empty_board():
    """Empty board returns None."""
    assert find_agent_task({}, "Bot") is None


# -- WIP limits --


def test_wip_blocked_planning_when_todo_full():
    """Planning is blocked when to_do hits its WIP limit."""
    board = {"to_do": [_task(f"GFD-{i}") for i in range(15)]}
    assert _is_wip_blocked("planning", board) is True


def test_wip_not_blocked_planning_when_todo_has_room():
    """Planning is not blocked when to_do has capacity."""
    board = {"to_do": [_task("GFD-1")]}
    assert _is_wip_blocked("planning", board) is False


def test_wip_blocked_todo_when_review_full():
    """To_do is blocked when review hits its WIP limit."""
    board = {"review": [_task(f"GFD-{i}") for i in range(3)]}
    assert _is_wip_blocked("to_do", board) is True


def test_wip_not_blocked_review():
    """Review has no downstream check."""
    assert _is_wip_blocked("review", {}) is False


def test_find_agent_task_respects_wip_limit():
    """Planning task is skipped when to_do is at WIP limit."""
    board = {
        "review": [],
        "planning": [_task("GFD-99")],
        "to_do": [_task(f"GFD-{i}", "matt") for i in range(15)],
    }
    assert find_agent_task(board, "Bot") is None


# -- session store --


def test_session_round_trip(tmp_path, monkeypatch):
    """Save and retrieve a session ID for a task key."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "abc-123")
    assert get_session("GFD-42") == "abc-123"


def test_session_returns_latest(tmp_path, monkeypatch):
    """Last-written session wins for a given task key."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "old")
    save_session("GFD-42", "new")
    assert get_session("GFD-42") == "new"


def test_session_missing_raises(tmp_path, monkeypatch):
    """Requesting a session for an unknown key raises KeyError."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    with pytest.raises(KeyError):
        get_session("GFD-999")


def test_session_file_format(tmp_path, monkeypatch):
    """Each line is valid JSON with expected keys."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-1", "sid-1")
    save_session("GFD-2", "sid-2")

    lines = sessions_file.read_text().strip().split("\n")
    assert len(lines) == 2
    for line in lines:
        record = json.loads(line)
        assert "task_key" in record
        assert "session_id" in record
