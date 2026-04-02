"""Lightweight tests for ticket_loop — pure logic and basic I/O only."""

import json
import subprocess
from unittest.mock import MagicMock, patch

import pytest

from ticket_loop.main import (
    COLUMN_HANDLERS,
    _run_loop,
    _run_with_session_retry,
    _swap_session_to_resume,
    get_session,
    handle_in_progress,
    handle_plan_review,
    handle_review,
    resume_session,
    save_session,
)


def _fetch_result(
    selected_task: dict | None = None,
    selected_column: str | None = None,
    reason: str = "test reason",
    board_state: dict | None = None,
) -> dict:
    """Build a run_fetch_task return value."""
    if board_state is None:
        board_state = {"review": [], "plan_review": [], "to_do": [], "planning": []}
    return {
        "board_state": board_state,
        "selected_task": selected_task,
        "selected_column": selected_column,
        "reason": reason,
    }


# -- import smoke test --


def test_module_imports():
    """Catch syntax errors and broken imports."""
    import ticket_loop.main  # noqa: F401


# -- _run_loop handler dispatch --


_FAKE_CONFIG = {"base_url": "u", "username": "u", "api_token": "t"}


def _patch_load_config():
    return patch("ticket_loop.main.load_config", return_value=_FAKE_CONFIG)


def _patch_jira_client():
    return patch("ticket_loop.main.JiraClient", return_value=MagicMock())


def test_run_loop_dispatches_to_review(monkeypatch):
    """_run_loop dispatches to handle_review for review column."""
    monkeypatch.setenv("JIRA_AGENT_USERNAME", "Bot")
    task = {"key": "GFD-1", "summary": "Fix bug", "labels": []}
    result = _fetch_result(selected_task=task, selected_column="review")
    mock_handler = MagicMock()

    with (
        patch("ticket_loop.main.run_fetch_task", return_value=result),
        patch.dict(COLUMN_HANDLERS, {"review": mock_handler}),
        _patch_load_config(),
        _patch_jira_client(),
    ):
        _run_loop()

    mock_handler.assert_called_once_with(task, skip_permissions=False)


def test_run_loop_dispatches_to_todo(monkeypatch):
    """_run_loop dispatches to handle_to_do for to_do column."""
    monkeypatch.setenv("JIRA_AGENT_USERNAME", "Bot")
    task = {"key": "GFD-2", "summary": "New feature", "labels": []}
    result = _fetch_result(selected_task=task, selected_column="to_do")
    mock_handler = MagicMock()

    with (
        patch("ticket_loop.main.run_fetch_task", return_value=result),
        patch.dict(COLUMN_HANDLERS, {"to_do": mock_handler}),
        _patch_load_config(),
        _patch_jira_client(),
    ):
        _run_loop()

    mock_handler.assert_called_once_with(task, skip_permissions=False)


def test_run_loop_dispatches_to_planning(monkeypatch):
    """_run_loop dispatches to handle_planning for planning column."""
    monkeypatch.setenv("JIRA_AGENT_USERNAME", "Bot")
    task = {"key": "GFD-3", "summary": "Plan work", "labels": []}
    result = _fetch_result(selected_task=task, selected_column="planning")
    mock_handler = MagicMock()

    with (
        patch("ticket_loop.main.run_fetch_task", return_value=result),
        patch.dict(COLUMN_HANDLERS, {"planning": mock_handler}),
        _patch_load_config(),
        _patch_jira_client(),
    ):
        _run_loop()

    mock_handler.assert_called_once_with(task, skip_permissions=False)


def test_run_loop_no_task_available(monkeypatch):
    """_run_loop returns without calling a handler when no task is selected."""
    monkeypatch.setenv("JIRA_AGENT_USERNAME", "Bot")
    result = _fetch_result(reason="No eligible tasks found for Bot")
    mock_handler = MagicMock()

    with (
        patch("ticket_loop.main.run_fetch_task", return_value=result),
        patch.dict(COLUMN_HANDLERS, {"review": mock_handler}),
        _patch_load_config(),
        _patch_jira_client(),
    ):
        _run_loop()

    mock_handler.assert_not_called()


def test_run_loop_passes_skip_permissions(monkeypatch):
    """skip_permissions flag is forwarded to the handler."""
    monkeypatch.setenv("JIRA_AGENT_USERNAME", "Bot")
    task = {"key": "GFD-4", "summary": "Task", "labels": []}
    result = _fetch_result(selected_task=task, selected_column="to_do")
    mock_handler = MagicMock()

    with (
        patch("ticket_loop.main.run_fetch_task", return_value=result),
        patch.dict(COLUMN_HANDLERS, {"to_do": mock_handler}),
        _patch_load_config(),
        _patch_jira_client(),
    ):
        _run_loop(skip_permissions=True)

    mock_handler.assert_called_once_with(task, skip_permissions=True)


def test_run_loop_calls_fetch_task_with_correct_args(monkeypatch):
    """_run_loop passes project, agent name, and client to run_fetch_task."""
    monkeypatch.setenv("JIRA_AGENT_USERNAME", "Bot")
    result = _fetch_result()
    mock_client = MagicMock()

    with (
        patch("ticket_loop.main.run_fetch_task", return_value=result) as mock_fetch,
        _patch_load_config(),
        patch("ticket_loop.main.JiraClient", return_value=mock_client),
    ):
        _run_loop()

    mock_fetch.assert_called_once_with(
        project="GFD", assigned_to_user_name="Bot", client=mock_client
    )


def test_run_loop_logs_board_state(monkeypatch, capsys):
    """_run_loop prints board state summary for observability."""
    monkeypatch.setenv("JIRA_AGENT_USERNAME", "Bot")
    board = {
        "review": [{"key": "GFD-1"}],
        "to_do": [{"key": "GFD-2"}, {"key": "GFD-3"}],
    }
    result = _fetch_result(board_state=board, reason="No eligible tasks found for Bot")

    with (
        patch("ticket_loop.main.run_fetch_task", return_value=result),
        _patch_load_config(),
        _patch_jira_client(),
    ):
        _run_loop()

    output = capsys.readouterr().out
    assert "review: 1 issue(s)" in output
    assert "to_do: 2 issue(s)" in output
    assert "No eligible tasks found for Bot" in output


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


def test_resume_session_calls_claude(tmp_path, monkeypatch):
    """resume_session looks up the session and launches an interactive claude."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "resume-sid")

    with patch("ticket_loop.main.subprocess.run") as mock_run:
        resume_session("GFD-42")

    cmd = mock_run.call_args.args[0]
    assert "claude" in cmd
    assert "--session-id" in cmd
    assert "resume-sid" in cmd
    assert "-p" not in cmd


def test_resume_session_raises_for_unknown_key(tmp_path, monkeypatch):
    """resume_session raises KeyError when no session exists for the given key."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    with pytest.raises(KeyError):
        resume_session("GFD-999")


# -- session retry --


def test_swap_session_to_resume():
    """--session-id is replaced with --resume, other args unchanged."""
    cmd = ["claude", "-p", "--session-id", "abc", "--verbose"]
    assert _swap_session_to_resume(cmd) == [
        "claude",
        "-p",
        "--resume",
        "abc",
        "--verbose",
    ]


def test_run_with_session_retry_succeeds_first_try():
    """No retry when the first subprocess call succeeds."""
    with patch("ticket_loop.main.subprocess.run") as mock_run:
        _run_with_session_retry(["claude", "--session-id", "new-sid"])

    assert mock_run.call_count == 1


def test_run_with_session_retry_retries_on_conflict():
    """Retries with --resume when --session-id fails with 'already in use'."""
    conflict = subprocess.CalledProcessError(
        1, "claude", stderr="Session ID abc is already in use."
    )
    with patch("ticket_loop.main.subprocess.run") as mock_run:
        mock_run.side_effect = [conflict, None]
        _run_with_session_retry(["claude", "--session-id", "abc"])

    assert mock_run.call_count == 2
    retry_cmd = mock_run.call_args_list[1].args[0]
    assert "--resume" in retry_cmd
    assert "--session-id" not in retry_cmd


def test_run_with_session_retry_propagates_other_errors():
    """Non-conflict errors are re-raised immediately."""
    other_error = subprocess.CalledProcessError(
        1, "claude", stderr="Something else went wrong"
    )
    with patch("ticket_loop.main.subprocess.run", side_effect=other_error):
        with pytest.raises(subprocess.CalledProcessError):
            _run_with_session_retry(["claude", "--session-id", "abc"])


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


# -- handle_in_progress --


def test_handle_in_progress_resumes_session(tmp_path, monkeypatch):
    """When a saved session exists, resume it with run_claude_task."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    save_session("GFD-50", "existing-sid")
    task = {"key": "GFD-50", "summary": "Stuck task", "labels": []}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_in_progress(task)

    mock_claude.assert_called_once()
    call_kwargs = mock_claude.call_args
    assert call_kwargs.kwargs["session_id"] == "existing-sid"
    assert "GFD-50" in call_kwargs.args[0]


def test_handle_in_progress_reassigns_when_no_session(tmp_path, monkeypatch):
    """When no session exists, add a Jira comment and reassign to human."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    task = {"key": "GFD-51", "summary": "Orphan task", "labels": []}

    with (
        patch("ticket_loop.main.subprocess.run") as mock_run,
        patch("ticket_loop.main.run_claude_task") as mock_claude,
    ):
        handle_in_progress(task)

    # Should NOT launch a Claude session
    mock_claude.assert_not_called()

    # Should have called jira-utils add-comment and update-issue --assignee
    commands = [call.args[0] for call in mock_run.call_args_list]
    comment_cmd = next(c for c in commands if "add-comment" in c)
    assert "--issue-key" in comment_cmd
    assert "GFD-51" in comment_cmd

    reassign_cmd = next(c for c in commands if "update-issue" in c)
    assert "--assignee" in reassign_cmd
    assert "human-123" in reassign_cmd


def test_handle_in_progress_passes_skip_permissions(tmp_path, monkeypatch):
    """skip_permissions flag is forwarded to run_claude_task when resuming."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    save_session("GFD-52", "perm-sid")
    task = {"key": "GFD-52", "summary": "Task", "labels": []}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_in_progress(task, skip_permissions=True)

    assert mock_claude.call_args.kwargs["skip_permissions"] is True


# -- plan_review column handler --


def test_column_handlers_includes_plan_review():
    """COLUMN_HANDLERS maps plan_review to handle_plan_review."""
    assert "plan_review" in COLUMN_HANDLERS
    assert COLUMN_HANDLERS["plan_review"] is handle_plan_review


def test_run_loop_dispatches_to_plan_review(monkeypatch):
    """_run_loop dispatches to handle_plan_review for plan_review column."""
    monkeypatch.setenv("JIRA_AGENT_USERNAME", "Bot")
    task = {"key": "GFD-5", "summary": "Review plan", "labels": []}
    result = _fetch_result(selected_task=task, selected_column="plan_review")
    mock_handler = MagicMock()

    with (
        patch("ticket_loop.main.run_fetch_task", return_value=result),
        patch.dict(COLUMN_HANDLERS, {"plan_review": mock_handler}),
        _patch_load_config(),
        _patch_jira_client(),
    ):
        _run_loop()

    mock_handler.assert_called_once_with(task, skip_permissions=False)


def test_handle_plan_review_resumes_session(tmp_path, monkeypatch):
    """handle_plan_review looks up the saved session and runs a Claude task."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    save_session("GFD-60", "plan-review-sid")
    task = {"key": "GFD-60", "summary": "Plan task", "labels": []}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_plan_review(task)

    mock_claude.assert_called_once()
    call_kwargs = mock_claude.call_args
    assert call_kwargs.kwargs["session_id"] == "plan-review-sid"
    assert "GFD-60" in call_kwargs.args[0]
    assert "Plan Review" in call_kwargs.args[0]


def test_handle_plan_review_passes_skip_permissions(tmp_path, monkeypatch):
    """skip_permissions flag is forwarded to run_claude_task."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    save_session("GFD-61", "perm-sid")
    task = {"key": "GFD-61", "summary": "Plan task", "labels": []}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_plan_review(task, skip_permissions=True)

    assert mock_claude.call_args.kwargs["skip_permissions"] is True


# -- handle_review no longer checks plan label --


# -- _run_loop return value --


def test_run_loop_returns_true_on_task_found(monkeypatch):
    """_run_loop returns True when a task is dispatched."""
    monkeypatch.setenv("JIRA_AGENT_USERNAME", "Bot")
    task = {"key": "GFD-10", "summary": "Do thing", "labels": []}
    result = _fetch_result(selected_task=task, selected_column="to_do")
    mock_handler = MagicMock()

    with (
        patch("ticket_loop.main.run_fetch_task", return_value=result),
        patch.dict(COLUMN_HANDLERS, {"to_do": mock_handler}),
        _patch_load_config(),
        _patch_jira_client(),
    ):
        got = _run_loop()

    assert got is True


def test_run_loop_returns_false_on_no_task(monkeypatch):
    """_run_loop returns False when no task is available."""
    monkeypatch.setenv("JIRA_AGENT_USERNAME", "Bot")
    result = _fetch_result(reason="No tasks")

    with (
        patch("ticket_loop.main.run_fetch_task", return_value=result),
        _patch_load_config(),
        _patch_jira_client(),
    ):
        got = _run_loop()

    assert got is False


# -- handle_review no longer checks plan label --


def test_handle_review_does_not_branch_on_plan_label(tmp_path, monkeypatch):
    """handle_review always does implementation review, regardless of labels."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    save_session("GFD-70", "review-sid")
    task = {"key": "GFD-70", "summary": "Review task", "labels": ["plan"]}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_review(task)

    # Should mention PR/implementation review, not plan review
    prompt = mock_claude.call_args.args[0]
    assert "Review" in prompt
    assert "pull request" in prompt.lower() or "address-pr" in prompt.lower()
