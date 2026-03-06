"""Unified CLI entry point for jira-utils."""

import typer
from dotenv import load_dotenv

from jira_utils.add_comment import app as add_comment_app
from jira_utils.add_to_sprint import app as add_to_sprint_app
from jira_utils.create_issue import app as create_issue_app
from jira_utils.create_issue_link import app as create_issue_link_app
from jira_utils.get_board_issues import app as get_board_issues_app
from jira_utils.get_boards import app as get_boards_app
from jira_utils.get_issue import app as get_issue_app
from jira_utils.get_link_types import app as get_link_types_app
from jira_utils.get_project_components import app as get_project_components_app
from jira_utils.get_project_versions import app as get_project_versions_app
from jira_utils.get_sprints import app as get_sprints_app
from jira_utils.get_transitions import app as get_transitions_app
from jira_utils.move_to_backlog import app as move_to_backlog_app
from jira_utils.move_to_board import app as move_to_board_app
from jira_utils.search import app as search_app
from jira_utils.transition_issue import app as transition_issue_app
from jira_utils.update_issue import app as update_issue_app

app = typer.Typer(help="Jira CLI utilities.")


@app.callback()
def _load_env() -> None:
    """Load .env from CWD or parent directories before running any subcommand."""
    load_dotenv()


app.add_typer(add_comment_app, name="add-comment")
app.add_typer(add_to_sprint_app, name="add-to-sprint")
app.add_typer(create_issue_app, name="create-issue")
app.add_typer(create_issue_link_app, name="create-issue-link")
app.add_typer(get_board_issues_app, name="get-board-issues")
app.add_typer(get_boards_app, name="get-boards")
app.add_typer(get_issue_app, name="get-issue")
app.add_typer(get_link_types_app, name="get-link-types")
app.add_typer(get_project_components_app, name="get-project-components")
app.add_typer(get_project_versions_app, name="get-project-versions")
app.add_typer(get_sprints_app, name="get-sprints")
app.add_typer(get_transitions_app, name="get-transitions")
app.add_typer(move_to_backlog_app, name="move-to-backlog")
app.add_typer(move_to_board_app, name="move-to-board")
app.add_typer(search_app, name="search")
app.add_typer(transition_issue_app, name="transition-issue")
app.add_typer(update_issue_app, name="update-issue")

if __name__ == "__main__":
    app()
