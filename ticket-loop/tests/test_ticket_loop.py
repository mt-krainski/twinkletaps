"""Lightweight tests for ticket_loop — pure logic and basic I/O only."""

import json
import signal
import subprocess
from unittest.mock import MagicMock, patch

import pytest

from ticket_loop.main import (
    COLUMN_HANDLERS,
    Phase,
    _run_continuous,
    _run_in_process_group,
    _run_loop,
    _run_with_session_retry,
    _swap_session_to_resume,
    get_session,
    handle_in_progress,
    handle_plan_review,
    handle_planning,
    handle_review,
    handle_to_do,
    phase_for_column,
    resolve_session,
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

    save_session("GFD-42", "abc-123", Phase.IMPLEMENTATION)
    assert get_session("GFD-42", Phase.IMPLEMENTATION) == "abc-123"


def test_session_returns_latest(tmp_path, monkeypatch):
    """Last-written session wins for a given task key."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "old", Phase.IMPLEMENTATION)
    save_session("GFD-42", "new", Phase.IMPLEMENTATION)
    assert get_session("GFD-42", Phase.IMPLEMENTATION) == "new"


def test_session_missing_raises(tmp_path, monkeypatch):
    """Requesting a session for an unknown key raises KeyError."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    with pytest.raises(KeyError):
        get_session("GFD-999", Phase.IMPLEMENTATION)


def test_resume_session_calls_claude(tmp_path, monkeypatch):
    """resume_session looks up the session and launches an interactive claude."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "resume-sid", Phase.IMPLEMENTATION)

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

    save_session("GFD-1", "sid-1", Phase.IMPLEMENTATION)
    save_session("GFD-2", "sid-2", Phase.PLANNING)

    lines = sessions_file.read_text().strip().split("\n")
    assert len(lines) == 2
    for line in lines:
        record = json.loads(line)
        assert "task_key" in record
        assert "session_id" in record
        assert "phase" in record


# -- handle_in_progress --


def test_handle_in_progress_resumes_session(tmp_path, monkeypatch):
    """When a saved session exists, resume it with run_claude_task."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    save_session("GFD-50", "existing-sid", Phase.IMPLEMENTATION)
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

    save_session("GFD-52", "perm-sid", Phase.IMPLEMENTATION)
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

    save_session("GFD-60", "plan-review-sid", Phase.PLANNING)
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

    save_session("GFD-61", "perm-sid", Phase.PLANNING)
    task = {"key": "GFD-61", "summary": "Plan task", "labels": []}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_plan_review(task, skip_permissions=True)

    assert mock_claude.call_args.kwargs["skip_permissions"] is True


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

    save_session("GFD-70", "review-sid", Phase.IMPLEMENTATION)
    task = {"key": "GFD-70", "summary": "Review task", "labels": ["plan"]}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_review(task)

    # Should mention PR/implementation review, not plan review
    prompt = mock_claude.call_args.args[0]
    assert "Review" in prompt
    assert "pull request" in prompt.lower() or "address-pr" in prompt.lower()


# -- _run_continuous --


def test_run_continuous_resets_backoff_on_work():
    """Backoff timer resets when _run_loop finds work."""
    mock_timer = MagicMock()
    mock_timer.delay = 60

    with (
        patch("ticket_loop.main._run_loop", return_value=True),
        patch("ticket_loop.main.BackoffTimer", return_value=mock_timer),
        patch("ticket_loop.main.threading.Event") as mock_event_cls,
        patch("ticket_loop.main.signal.signal"),
    ):
        shutdown_event = MagicMock()
        shutdown_event.is_set.side_effect = [False, False, True]
        mock_event_cls.return_value = shutdown_event

        _run_continuous()

    assert mock_timer.reset.call_count == 2


def test_run_continuous_backs_off_on_idle():
    """When no work found, waits for delay and steps the timer."""
    mock_timer = MagicMock()
    mock_timer.delay = 60

    with (
        patch("ticket_loop.main._run_loop", return_value=False),
        patch("ticket_loop.main.BackoffTimer", return_value=mock_timer),
        patch("ticket_loop.main.threading.Event") as mock_event_cls,
        patch("ticket_loop.main.signal.signal"),
    ):
        shutdown_event = MagicMock()
        shutdown_event.is_set.side_effect = [False, True]
        mock_event_cls.return_value = shutdown_event

        _run_continuous()

    shutdown_event.wait.assert_called_once_with(60)
    mock_timer.step.assert_called_once()
    mock_timer.reset.assert_not_called()


def test_run_continuous_stops_on_shutdown_event():
    """Loop exits when shutdown event is set."""
    with (
        patch("ticket_loop.main._run_loop") as mock_run_loop,
        patch("ticket_loop.main.BackoffTimer") as mock_timer_cls,
        patch("ticket_loop.main.threading.Event") as mock_event_cls,
        patch("ticket_loop.main.signal.signal"),
    ):
        mock_timer = MagicMock()
        mock_timer.delay = 60
        mock_timer_cls.return_value = mock_timer

        shutdown_event = MagicMock()
        shutdown_event.is_set.return_value = True
        mock_event_cls.return_value = shutdown_event

        _run_continuous()

    mock_run_loop.assert_not_called()
    mock_timer.reset.assert_not_called()
    mock_timer.step.assert_not_called()


def test_run_continuous_catches_exceptions():
    """Exceptions from _run_loop are caught; loop treats them as idle."""
    mock_timer = MagicMock()
    mock_timer.delay = 60

    with (
        patch(
            "ticket_loop.main._run_loop",
            side_effect=RuntimeError("network error"),
        ),
        patch("ticket_loop.main.BackoffTimer", return_value=mock_timer),
        patch("ticket_loop.main.threading.Event") as mock_event_cls,
        patch("ticket_loop.main.signal.signal"),
    ):
        shutdown_event = MagicMock()
        shutdown_event.is_set.side_effect = [False, True]
        mock_event_cls.return_value = shutdown_event

        _run_continuous()

    # Should back off (not reset) after exception
    shutdown_event.wait.assert_called_once_with(60)
    mock_timer.step.assert_called_once()
    mock_timer.reset.assert_not_called()


# -- --continuous flag wiring --


def test_continuous_flag_routes_to_run_continuous():
    """--continuous flag calls _run_continuous instead of _run_loop."""
    from typer.testing import CliRunner

    from ticket_loop.main import app

    runner = CliRunner()

    with patch("ticket_loop.main._run_continuous") as mock_cont:
        result = runner.invoke(app, ["--continuous"])

    mock_cont.assert_called_once_with(skip_permissions=False)
    assert result.exit_code == 0


def test_continuous_flag_with_skip_permissions():
    """--continuous --dangerously-skip-permissions forwards both flags."""
    from typer.testing import CliRunner

    from ticket_loop.main import app

    runner = CliRunner()

    with patch("ticket_loop.main._run_continuous") as mock_cont:
        result = runner.invoke(app, ["--continuous", "--dangerously-skip-permissions"])

    mock_cont.assert_called_once_with(skip_permissions=True)
    assert result.exit_code == 0


# -- phase_for_column --


@pytest.mark.parametrize("column", ["planning", "plan_review"])
def test_phase_for_column_planning(column):
    """Planning and plan_review columns map to Phase.PLANNING."""
    result = phase_for_column(column)
    assert result is Phase.PLANNING


@pytest.mark.parametrize("column", ["to_do", "in_progress", "review"])
def test_phase_for_column_implementation(column):
    """Other columns map to Phase.IMPLEMENTATION."""
    result = phase_for_column(column)
    assert result is Phase.IMPLEMENTATION


# -- session phase isolation --


def test_session_phase_isolation(tmp_path, monkeypatch):
    """Same task key with different phases stores and retrieves independently."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "plan-sid", Phase.PLANNING)
    save_session("GFD-42", "impl-sid", Phase.IMPLEMENTATION)

    assert get_session("GFD-42", Phase.PLANNING) == "plan-sid"
    assert get_session("GFD-42", Phase.IMPLEMENTATION) == "impl-sid"


def test_session_old_records_without_phase_not_matched_by_phase(tmp_path, monkeypatch):
    """Records without a phase field don't match phase-filtered lookups."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    # Write a legacy record without phase
    record = {"task_key": "GFD-42", "session_id": "legacy-sid"}
    with open(sessions_file, "a") as f:
        f.write(json.dumps(record) + "\n")

    with pytest.raises(KeyError):
        get_session("GFD-42", Phase.PLANNING)
    with pytest.raises(KeyError):
        get_session("GFD-42", Phase.IMPLEMENTATION)


def test_session_old_records_matched_by_none_phase(tmp_path, monkeypatch):
    """Records without a phase field match when phase=None."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    record = {"task_key": "GFD-42", "session_id": "legacy-sid"}
    with open(sessions_file, "a") as f:
        f.write(json.dumps(record) + "\n")

    assert get_session("GFD-42", None) == "legacy-sid"


# -- resolve_session multi-phase lookup --


def test_resolve_session_returns_first_match(tmp_path, monkeypatch):
    """resolve_session returns the first matching phase in order."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "plan-sid", Phase.PLANNING)
    save_session("GFD-42", "impl-sid", Phase.IMPLEMENTATION)

    result = resolve_session("GFD-42", [Phase.IMPLEMENTATION, Phase.PLANNING, None])
    assert result == "impl-sid"


def test_resolve_session_skips_missing_phases(tmp_path, monkeypatch):
    """resolve_session skips phases with no session and returns the next."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "plan-sid", Phase.PLANNING)

    result = resolve_session("GFD-42", [Phase.IMPLEMENTATION, Phase.PLANNING])
    assert result == "plan-sid"


def test_resolve_session_raises_when_none_match(tmp_path, monkeypatch):
    """resolve_session raises KeyError when no phase matches."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "plan-sid", Phase.PLANNING)

    with pytest.raises(KeyError):
        resolve_session("GFD-42", [Phase.IMPLEMENTATION, None])


# -- resume_session phase fallback --


def test_resume_session_prefers_implementation(tmp_path, monkeypatch):
    """When both phases exist, resume uses the implementation session."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "plan-sid", Phase.PLANNING)
    save_session("GFD-42", "impl-sid", Phase.IMPLEMENTATION)

    with patch("ticket_loop.main.subprocess.run") as mock_run:
        resume_session("GFD-42")

    cmd = mock_run.call_args.args[0]
    assert "impl-sid" in cmd


def test_resume_session_falls_back_to_planning(tmp_path, monkeypatch):
    """When only a planning session exists, resume uses it."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    save_session("GFD-42", "plan-sid", Phase.PLANNING)

    with patch("ticket_loop.main.subprocess.run") as mock_run:
        resume_session("GFD-42")

    cmd = mock_run.call_args.args[0]
    assert "plan-sid" in cmd


def test_resume_session_falls_back_to_legacy(tmp_path, monkeypatch):
    """When only a legacy no-phase session exists, resume uses it."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    # Write a legacy record without phase
    record = {"task_key": "GFD-42", "session_id": "legacy-sid"}
    with open(sessions_file, "a") as f:
        f.write(json.dumps(record) + "\n")

    with patch("ticket_loop.main.subprocess.run") as mock_run:
        resume_session("GFD-42")

    cmd = mock_run.call_args.args[0]
    assert "legacy-sid" in cmd


def test_resume_session_raises_when_no_session(tmp_path, monkeypatch):
    """When no sessions exist at all, KeyError is raised."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    with pytest.raises(KeyError):
        resume_session("GFD-999")


# -- handler phase usage --


def test_handle_planning_saves_planning_phase(tmp_path, monkeypatch):
    """handle_planning saves the session with 'planning' phase."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)

    task = {"key": "GFD-80", "summary": "Plan task"}

    with patch("ticket_loop.main.run_claude_task"):
        handle_planning(task)

    # Read the saved record and check phase
    record = json.loads(sessions_file.read_text().strip())
    assert record["phase"] == "planning"
    assert record["task_key"] == "GFD-80"


def test_handle_to_do_saves_implementation_phase(tmp_path, monkeypatch):
    """handle_to_do saves the session with 'implementation' phase."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("BASE_BRANCH", "main")

    task = {"key": "GFD-81", "summary": "Implement task"}

    with patch("ticket_loop.main.run_claude_task"):
        handle_to_do(task)

    record = json.loads(sessions_file.read_text().strip())
    assert record["phase"] == "implementation"
    assert record["task_key"] == "GFD-81"


def test_handle_plan_review_looks_up_planning_phase(tmp_path, monkeypatch):
    """handle_plan_review looks up session with 'planning' phase."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    save_session("GFD-82", "plan-sid", Phase.PLANNING)
    # Also save an implementation session — should NOT be used
    save_session("GFD-82", "impl-sid", Phase.IMPLEMENTATION)
    task = {"key": "GFD-82", "summary": "Review plan"}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_plan_review(task)

    assert mock_claude.call_args.kwargs["session_id"] == "plan-sid"


def test_handle_review_looks_up_implementation_phase(tmp_path, monkeypatch):
    """handle_review looks up session with 'implementation' phase."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    save_session("GFD-83", "plan-sid", Phase.PLANNING)
    save_session("GFD-83", "impl-sid", Phase.IMPLEMENTATION)
    task = {"key": "GFD-83", "summary": "Review impl"}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_review(task)

    assert mock_claude.call_args.kwargs["session_id"] == "impl-sid"


# -- legacy session fallback in handlers --


def test_handle_review_falls_back_to_legacy_session(tmp_path, monkeypatch):
    """handle_review falls back to legacy session."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    # Write a legacy record without phase
    record = {"task_key": "GFD-106", "session_id": "legacy-sid"}
    with open(sessions_file, "a") as f:
        f.write(json.dumps(record) + "\n")

    task = {"key": "GFD-106", "summary": "Review legacy"}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_review(task)

    assert mock_claude.call_args.kwargs["session_id"] == "legacy-sid"


def test_handle_in_progress_falls_back_to_legacy_session(tmp_path, monkeypatch):
    """handle_in_progress falls back to legacy session."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    record = {"task_key": "GFD-107", "session_id": "legacy-sid"}
    with open(sessions_file, "a") as f:
        f.write(json.dumps(record) + "\n")

    task = {"key": "GFD-107", "summary": "Continue legacy"}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_in_progress(task)

    assert mock_claude.call_args.kwargs["session_id"] == "legacy-sid"


def test_handle_plan_review_falls_back_to_legacy_session(tmp_path, monkeypatch):
    """handle_plan_review falls back to legacy session."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    record = {"task_key": "GFD-108", "session_id": "legacy-sid"}
    with open(sessions_file, "a") as f:
        f.write(json.dumps(record) + "\n")

    task = {"key": "GFD-108", "summary": "Review plan legacy"}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_plan_review(task)

    assert mock_claude.call_args.kwargs["session_id"] == "legacy-sid"


def test_handle_in_progress_looks_up_implementation_phase(tmp_path, monkeypatch):
    """handle_in_progress looks up session with 'implementation' phase."""
    sessions_file = tmp_path / "sessions.jsonl"
    monkeypatch.setattr("ticket_loop.main.SESSIONS_FILE", sessions_file)
    monkeypatch.setenv("HUMAN_ATLASSIAN_ID", "human-123")

    save_session("GFD-84", "plan-sid", Phase.PLANNING)
    save_session("GFD-84", "impl-sid", Phase.IMPLEMENTATION)
    task = {"key": "GFD-84", "summary": "Continue impl"}

    with patch("ticket_loop.main.run_claude_task") as mock_claude:
        handle_in_progress(task)

    assert mock_claude.call_args.kwargs["session_id"] == "impl-sid"


# -- _run_in_process_group --


def _mock_proc(*, returncode=0, stdout=None, stderr=None):
    """Create a mock Popen process for _run_in_process_group tests."""
    proc = MagicMock()
    proc.pid = 12345
    proc.returncode = returncode
    proc.communicate.return_value = (stdout, stderr)
    proc.args = ["claude", "-p"]
    return proc


def _signal_tracker():
    """Build a fake signal.signal that tracks installed handlers."""
    installed = {}

    def fake_signal(signum, handler):
        old = installed.get(signum, signal.SIG_DFL)
        installed[signum] = handler
        return old

    return fake_signal, installed


class TestRunInProcessGroup:
    """Tests for _run_in_process_group signal-safe subprocess runner."""

    def test_returns_completed_process_on_success(self):
        """Child exits 0, returns CompletedProcess with correct returncode."""
        proc = _mock_proc(returncode=0)
        with patch("ticket_loop.main.subprocess.Popen", return_value=proc):
            result = _run_in_process_group(["claude", "-p"])

        assert isinstance(result, subprocess.CompletedProcess)
        assert result.returncode == 0

    def test_check_raises_on_nonzero_exit(self):
        """Non-zero exit with check=True raises CalledProcessError."""
        proc = _mock_proc(returncode=1, stderr="some error")
        with patch("ticket_loop.main.subprocess.Popen", return_value=proc):
            with pytest.raises(subprocess.CalledProcessError) as exc_info:
                _run_in_process_group(["claude", "-p"], check=True)

        assert exc_info.value.returncode == 1
        assert exc_info.value.stderr == "some error"

    def test_nonzero_exit_without_check_returns_normally(self):
        """Non-zero exit with check=False returns CompletedProcess."""
        proc = _mock_proc(returncode=1)
        with patch("ticket_loop.main.subprocess.Popen", return_value=proc):
            result = _run_in_process_group(["claude", "-p"], check=False)

        assert result.returncode == 1

    def test_passes_kwargs_to_popen(self):
        """Extra kwargs (cwd, stderr, text) are forwarded to Popen."""
        proc = _mock_proc()
        with patch(
            "ticket_loop.main.subprocess.Popen", return_value=proc
        ) as mock_popen:
            _run_in_process_group(
                ["claude", "-p"], cwd="/workspace", stderr=subprocess.PIPE, text=True
            )

        mock_popen.assert_called_once_with(
            ["claude", "-p"],
            start_new_session=True,
            cwd="/workspace",
            stderr=subprocess.PIPE,
            text=True,
        )

    def test_popen_uses_start_new_session(self):
        """Popen is called with start_new_session=True."""
        proc = _mock_proc()
        with patch(
            "ticket_loop.main.subprocess.Popen", return_value=proc
        ) as mock_popen:
            _run_in_process_group(["claude", "-p"])

        assert mock_popen.call_args.kwargs["start_new_session"] is True

    def test_sigint_forwards_sigterm_to_child_group(self):
        """SIGINT sends SIGTERM to child process group via os.killpg."""
        proc = _mock_proc(returncode=-signal.SIGTERM)
        fake_signal, installed = _signal_tracker()

        def fake_communicate():
            handler = installed.get(signal.SIGINT)
            if callable(handler):
                handler(signal.SIGINT, None)
            return (None, None)

        proc.communicate.side_effect = fake_communicate

        with (
            patch("ticket_loop.main.subprocess.Popen", return_value=proc),
            patch("ticket_loop.main.signal.signal", side_effect=fake_signal),
            patch("ticket_loop.main.os.killpg") as mock_killpg,
            patch("ticket_loop.main.os.getpgid", return_value=12345),
        ):
            with pytest.raises(KeyboardInterrupt):
                _run_in_process_group(["claude", "-p"])

        mock_killpg.assert_any_call(12345, signal.SIGTERM)

    def test_sigint_raises_keyboard_interrupt(self):
        """After child exits from forwarded SIGINT, KeyboardInterrupt is raised."""
        proc = _mock_proc(returncode=-signal.SIGTERM)
        fake_signal, installed = _signal_tracker()

        def fake_communicate():
            handler = installed.get(signal.SIGINT)
            if callable(handler):
                handler(signal.SIGINT, None)
            return (None, None)

        proc.communicate.side_effect = fake_communicate

        with (
            patch("ticket_loop.main.subprocess.Popen", return_value=proc),
            patch("ticket_loop.main.signal.signal", side_effect=fake_signal),
            patch("ticket_loop.main.os.killpg"),
            patch("ticket_loop.main.os.getpgid", return_value=12345),
        ):
            with pytest.raises(KeyboardInterrupt):
                _run_in_process_group(["claude", "-p"])

    def test_sigterm_raises_system_exit(self):
        """After SIGTERM forwarding, SystemExit is raised."""
        proc = _mock_proc(returncode=-signal.SIGTERM)
        fake_signal, installed = _signal_tracker()

        def fake_communicate():
            handler = installed.get(signal.SIGTERM)
            if callable(handler):
                handler(signal.SIGTERM, None)
            return (None, None)

        proc.communicate.side_effect = fake_communicate

        with (
            patch("ticket_loop.main.subprocess.Popen", return_value=proc),
            patch("ticket_loop.main.signal.signal", side_effect=fake_signal),
            patch("ticket_loop.main.os.killpg"),
            patch("ticket_loop.main.os.getpgid", return_value=12345),
        ):
            with pytest.raises(SystemExit):
                _run_in_process_group(["claude", "-p"])

    def test_sigkill_escalation_on_timeout(self):
        """SIGKILL sent when child doesn't exit within grace period."""
        proc = _mock_proc(returncode=-signal.SIGKILL)
        proc.wait.side_effect = subprocess.TimeoutExpired(cmd="claude", timeout=5)
        fake_signal, installed = _signal_tracker()

        def fake_thread_class(*, target, args=(), daemon=False):
            target(*args)
            return MagicMock()

        def fake_communicate():
            handler = installed.get(signal.SIGINT)
            if callable(handler):
                handler(signal.SIGINT, None)
            return (None, None)

        proc.communicate.side_effect = fake_communicate

        with (
            patch("ticket_loop.main.subprocess.Popen", return_value=proc),
            patch("ticket_loop.main.signal.signal", side_effect=fake_signal),
            patch("ticket_loop.main.os.killpg") as mock_killpg,
            patch("ticket_loop.main.os.getpgid", return_value=12345),
            patch("ticket_loop.main.threading.Thread", side_effect=fake_thread_class),
        ):
            with pytest.raises(KeyboardInterrupt):
                _run_in_process_group(["claude", "-p"])

        mock_killpg.assert_any_call(12345, signal.SIGTERM)
        mock_killpg.assert_any_call(12345, signal.SIGKILL)

    def test_signal_handlers_restored_after_normal_exit(self):
        """Original signal handlers are restored after function returns."""
        proc = _mock_proc()
        handler_log = []
        original_sigint = signal.getsignal(signal.SIGINT)
        original_sigterm = signal.getsignal(signal.SIGTERM)

        def tracking_signal(signum, handler):
            handler_log.append((signum, handler))
            if signum == signal.SIGINT:
                return original_sigint
            return original_sigterm

        with (
            patch("ticket_loop.main.subprocess.Popen", return_value=proc),
            patch("ticket_loop.main.signal.signal", side_effect=tracking_signal),
        ):
            _run_in_process_group(["claude", "-p"])

        # 4 calls: install SIGINT, install SIGTERM, restore SIGINT, restore SIGTERM
        assert len(handler_log) == 4
        # Last two restore the originals saved by getsignal
        assert handler_log[2][1] == original_sigint
        assert handler_log[3][1] == original_sigterm

    def test_signal_handlers_restored_after_exception(self):
        """Signal handlers are restored even when check=True raises."""
        proc = _mock_proc(returncode=1)
        handler_log = []
        original_sigint = signal.getsignal(signal.SIGINT)
        original_sigterm = signal.getsignal(signal.SIGTERM)

        def tracking_signal(signum, handler):
            handler_log.append((signum, handler))
            if signum == signal.SIGINT:
                return original_sigint
            return original_sigterm

        with (
            patch("ticket_loop.main.subprocess.Popen", return_value=proc),
            patch("ticket_loop.main.signal.signal", side_effect=tracking_signal),
        ):
            with pytest.raises(subprocess.CalledProcessError):
                _run_in_process_group(["claude", "-p"], check=True)

        assert len(handler_log) == 4
        assert handler_log[2][1] == original_sigint
        assert handler_log[3][1] == original_sigterm

    def test_process_lookup_error_handled_on_sigterm(self):
        """ProcessLookupError from os.killpg is caught (child already dead)."""
        proc = _mock_proc(returncode=0)
        fake_signal, installed = _signal_tracker()

        def fake_communicate():
            handler = installed.get(signal.SIGINT)
            if callable(handler):
                handler(signal.SIGINT, None)
            return (None, None)

        proc.communicate.side_effect = fake_communicate

        with (
            patch("ticket_loop.main.subprocess.Popen", return_value=proc),
            patch("ticket_loop.main.signal.signal", side_effect=fake_signal),
            patch("ticket_loop.main.os.killpg", side_effect=ProcessLookupError),
            patch("ticket_loop.main.os.getpgid", return_value=12345),
        ):
            # Should not raise ProcessLookupError — caught internally
            with pytest.raises(KeyboardInterrupt):
                _run_in_process_group(["claude", "-p"])
