"""Tests for fetch-task command."""

from unittest.mock import MagicMock

import pytest

from jira_utils.client import JiraClient
from jira_utils.fetch_task import run_fetch_task


def _issue(
    key,
    status,
    *,
    issue_type="Task",
    assignee=None,
    issuelinks=None,
    priority="Medium",
    parent_key=None,
    labels=None,
):
    """Build a fake Jira issue dict matching v3 search shape."""
    fields = {
        "summary": f"Summary for {key}",
        "status": {"name": status},
        "issuetype": {"name": issue_type},
        "priority": {"name": priority},
        "assignee": {"displayName": assignee} if assignee else None,
        "parent": {"key": parent_key} if parent_key else None,
        "labels": labels or [],
        "issuelinks": issuelinks or [],
    }
    return {"key": key, "fields": fields}


def _blocker_link(key, status):
    """Build an issuelinks entry for an inward 'is blocked by' link."""
    return {
        "type": {"inward": "is blocked by", "outward": "blocks"},
        "inwardIssue": {
            "key": key,
            "fields": {
                "summary": f"Summary for {key}",
                "status": {"name": status},
            },
        },
    }


def _search_response(issues, *, next_page_token=None):
    """Wrap issues in a search response envelope."""
    resp = {"issues": issues, "total": len(issues)}
    if next_page_token:
        resp["nextPageToken"] = next_page_token
    return resp


class TestRunFetchTask:
    """Tests for run_fetch_task."""

    def test_basic_selection_review_picked_first(self):
        """Agent task in review column is picked first."""
        issues = [
            _issue("GFD-1", "To Do", assignee="Bot"),
            _issue("GFD-2", "Review", assignee="Bot"),
        ]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"]["key"] == "GFD-2"
        assert result["selected_column"] == "review"

    def test_column_priority_review_before_planning_before_to_do(self):
        """Review > planning > to_do priority order."""
        issues = [
            _issue("GFD-1", "To Do", assignee="Bot"),
            _issue("GFD-2", "Planning", assignee="Bot"),
        ]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"]["key"] == "GFD-2"
        assert result["selected_column"] == "planning"

    def test_in_progress_selected_first(self):
        """In-progress tasks have highest priority."""
        issues = [
            _issue("GFD-1", "In Progress", assignee="Bot"),
            _issue("GFD-2", "To Do", assignee="Bot"),
        ]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"]["key"] == "GFD-1"
        assert result["selected_column"] == "in_progress"

    def test_wip_limit_blocks_downstream(self):
        """Planning is skipped when downstream to_do is at WIP limit."""
        to_do_issues = [
            _issue(f"GFD-{i}", "To Do", assignee="Other") for i in range(1, 16)
        ]
        planning_issue = _issue("GFD-100", "Planning", assignee="Bot")
        review_issue = _issue("GFD-200", "Review", assignee="Bot")

        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(
            to_do_issues + [planning_issue, review_issue]
        )

        result = run_fetch_task("GFD", "Bot", client=client)

        # Planning blocked by to_do WIP, so review should be selected
        assert result["selected_task"]["key"] == "GFD-200"
        assert result["selected_column"] == "review"

    def test_epic_exclusion_from_wip(self):
        """Epics don't count toward WIP limits."""
        # 15 to_do issues but 5 are Epics => effective count is 10 (under limit)
        to_do_issues = [
            _issue(f"GFD-{i}", "To Do", assignee="Other", issue_type="Epic")
            for i in range(1, 6)
        ] + [_issue(f"GFD-{i}", "To Do", assignee="Other") for i in range(6, 16)]
        planning_issue = _issue("GFD-100", "Planning", assignee="Bot")

        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(to_do_issues + [planning_issue])

        result = run_fetch_task("GFD", "Bot", client=client)

        # Effective to_do WIP is 10 (under 15 limit), so planning is not blocked
        assert result["selected_task"]["key"] == "GFD-100"
        assert result["selected_column"] == "planning"

    def test_blocker_skips_task(self):
        """Task with active (non-Done) blocker is skipped."""
        blocked = _issue(
            "GFD-1",
            "Review",
            assignee="Bot",
            issuelinks=[_blocker_link("GFD-99", "In Progress")],
        )
        unblocked = _issue("GFD-2", "Review", assignee="Bot")

        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response([blocked, unblocked])

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"]["key"] == "GFD-2"

    def test_blocker_with_done_status_not_blocking(self):
        """Done blocker is filtered out and does not block."""
        issue = _issue(
            "GFD-1",
            "Review",
            assignee="Bot",
            issuelinks=[_blocker_link("GFD-99", "Done")],
        )

        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response([issue])

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"]["key"] == "GFD-1"
        assert result["selected_task"]["blocked_by"] == []

    def test_blocker_with_invalid_status_not_blocking(self):
        """Invalid blocker is filtered out and does not block."""
        issue = _issue(
            "GFD-1",
            "Review",
            assignee="Bot",
            issuelinks=[_blocker_link("GFD-99", "Invalid")],
        )

        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response([issue])

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"]["key"] == "GFD-1"

    def test_no_tasks_for_agent(self):
        """Returns null selected_task when no tasks match agent."""
        issues = [
            _issue("GFD-1", "To Do", assignee="OtherAgent"),
        ]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"] is None
        assert result["selected_column"] is None

    def test_empty_board(self):
        """Returns null selected_task on empty board."""
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response([])

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"] is None
        assert result["selected_column"] is None
        assert result["board_state"] == {}

    def test_pagination(self):
        """Multiple pages are fetched and merged."""
        page1_issues = [_issue("GFD-1", "Review", assignee="Bot")]
        page2_issues = [_issue("GFD-2", "To Do", assignee="Bot")]

        client = MagicMock(spec=JiraClient)
        client.post.side_effect = [
            _search_response(page1_issues, next_page_token="page2"),
            _search_response(page2_issues),
        ]

        result = run_fetch_task("GFD", "Bot", client=client)

        assert client.post.call_count == 2
        assert result["selected_task"]["key"] == "GFD-1"
        assert "review" in result["board_state"]
        assert "to_do" in result["board_state"]

    def test_board_state_structure(self):
        """Board state groups issues by column with normalized shape."""
        issues = [
            _issue(
                "GFD-1",
                "To Do",
                assignee="Bot",
                parent_key="GFD-99",
                labels=["frontend"],
            ),
        ]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        task = result["board_state"]["to_do"][0]
        assert task["key"] == "GFD-1"
        assert task["summary"] == "Summary for GFD-1"
        assert task["issue_type"] == "Task"
        assert task["priority"] == "Medium"
        assert task["assignee"] == "Bot"
        assert task["parent_key"] == "GFD-99"
        assert task["labels"] == ["frontend"]
        assert task["blocked_by"] == []

    def test_reason_included_in_result(self):
        """Result includes a human-readable reason."""
        issues = [_issue("GFD-1", "Review", assignee="Bot")]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        assert isinstance(result["reason"], str)
        assert len(result["reason"]) > 0

    def test_review_wip_limit_blocks_to_do_downstream(self):
        """To_do is blocked when its downstream (review) is at WIP limit."""
        review_issues = [
            _issue(f"GFD-{i}", "Review", assignee="Other") for i in range(1, 4)
        ]
        to_do_issue = _issue("GFD-10", "To Do", assignee="Bot")

        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(review_issues + [to_do_issue])

        result = run_fetch_task("GFD", "Bot", client=client)

        # review at WIP 3 => to_do downstream blocked, no other columns => None
        assert result["selected_task"] is None

    def test_plan_review_status_mapped_to_column(self):
        """Plan Review status is mapped to plan_review column."""
        issues = [_issue("GFD-1", "Plan Review", assignee="Bot")]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        assert "plan_review" in result["board_state"]
        assert result["selected_task"]["key"] == "GFD-1"
        assert result["selected_column"] == "plan_review"

    def test_plan_review_priority_after_review_before_planning(self):
        """Plan Review is selected before planning but after review."""
        issues = [
            _issue("GFD-1", "Planning", assignee="Bot"),
            _issue("GFD-2", "Plan Review", assignee="Bot"),
        ]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"]["key"] == "GFD-2"
        assert result["selected_column"] == "plan_review"

    def test_review_picked_over_plan_review(self):
        """Review column has priority over Plan Review."""
        issues = [
            _issue("GFD-1", "Plan Review", assignee="Bot"),
            _issue("GFD-2", "Review", assignee="Bot"),
        ]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"]["key"] == "GFD-2"
        assert result["selected_column"] == "review"

    def test_plan_review_wip_limit_blocks_planning(self):
        """Planning is blocked when plan_review is at WIP limit (3)."""
        plan_review_issues = [
            _issue(f"GFD-{i}", "Plan Review", assignee="Other") for i in range(1, 4)
        ]
        planning_issue = _issue("GFD-100", "Planning", assignee="Bot")

        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(
            plan_review_issues + [planning_issue]
        )

        result = run_fetch_task("GFD", "Bot", client=client)

        # plan_review at WIP 3 => planning blocked
        assert result["selected_task"] is None

    def test_planning_blocked_by_either_plan_review_or_to_do_wip(self):
        """Planning blocked when to_do is at WIP limit even if plan_review is not."""
        to_do_issues = [
            _issue(f"GFD-{i}", "To Do", assignee="Other") for i in range(1, 16)
        ]
        planning_issue = _issue("GFD-100", "Planning", assignee="Bot")

        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(to_do_issues + [planning_issue])

        result = run_fetch_task("GFD", "Bot", client=client)

        # to_do at WIP 15 => planning blocked
        assert result["selected_task"] is None

    def test_plan_review_wip_does_not_block_to_do(self):
        """plan_review WIP limit does NOT block the to_do column."""
        plan_review_issues = [
            _issue(f"GFD-{i}", "Plan Review", assignee="Other") for i in range(1, 4)
        ]
        to_do_issue = _issue("GFD-10", "To Do", assignee="Bot")

        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(plan_review_issues + [to_do_issue])

        result = run_fetch_task("GFD", "Bot", client=client)

        # plan_review at WIP 3 does not block to_do
        assert result["selected_task"]["key"] == "GFD-10"
        assert result["selected_column"] == "to_do"

    def test_unassigned_task_skipped(self):
        """Tasks with no assignee are skipped."""
        issues = [
            _issue("GFD-1", "Review", assignee=None),
            _issue("GFD-2", "Review", assignee="Bot"),
        ]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"]["key"] == "GFD-2"


class TestEnvVarFallbacks:
    """Tests for project and user name resolution."""

    def test_project_missing_raises(self):
        """ValueError when project is empty."""
        client = MagicMock(spec=JiraClient)

        with pytest.raises(ValueError, match="Project is required"):
            run_fetch_task("", assigned_to_user_name="Bot", client=client)

    def test_user_name_from_myself_endpoint(self):
        """User name falls back to /myself API when not provided."""
        issues = [_issue("GFD-1", "Review", assignee="Bot")]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)
        client.get.return_value = {"displayName": "Bot"}

        result = run_fetch_task("GFD", client=client)

        client.get.assert_called_once_with("/rest/api/3/myself")
        assert result["selected_task"]["key"] == "GFD-1"

    def test_explicit_args_used(self):
        """Explicit args are used directly."""
        issues = [_issue("GFD-1", "Review", assignee="Bot")]
        client = MagicMock(spec=JiraClient)
        client.post.return_value = _search_response(issues)

        result = run_fetch_task("GFD", "Bot", client=client)

        assert result["selected_task"]["key"] == "GFD-1"
