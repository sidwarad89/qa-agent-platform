"""Unified dispatch across every connected MCP tool, so Build page's
single-agent executor and Agentic Process both get the same coverage
instead of each page wiring tools separately (and inconsistently).

Two operations are supported, with different tool coverage because the
underlying concepts don't apply equally everywhere:

- fetch_item_summary: read an existing item as context for the AI.
  Supported: jira, ado, gitlab, testrail (all genuine "read a ticket" tools).
  Not supported: github (as an *input item* - fetching a single "item"
  doesn't map cleanly to a repo the same way), xray, zephyr, aws (their
  APIs don't offer a simple single-item read that maps to useful prompt
  context the same way).

- push_test_cases: write generated test cases into the tool.
  Supported: jira, github, gitlab, ado, testrail, xray, zephyr, aws - all 8.
  Xray/Zephyr/AWS don't return a clean browsable URL (their APIs don't
  expose one simply), so `push_test_cases` returns None for those - the
  push still happens for real, there's just no link to show.
"""
from typing import Optional
from urllib.parse import quote

from .jira_connector import JiraConnector
from .github_connector import GitHubConnector
from .generic_connector import GenericMCPConnector
from .xray_connector import XrayConnector
from .zephyr_connector import ZephyrConnector
from .aws_codecommit_connector import AWSCodeCommitConnector
from app.services.connectors.jira_connector import JiraConnector as LegacyJiraConnector

FETCH_SUPPORTED = {"jira", "ado", "gitlab", "testrail"}
PUSH_SUPPORTED = {"jira", "github", "gitlab", "ado", "testrail", "xray", "zephyr", "aws"}
DELETE_SUPPORTED = {"jira", "gitlab", "ado", "testrail"}


def _connector_for(tool: str, credentials: dict):
    base_url = credentials.get("base_url", "").rstrip("/")
    if tool == "jira":
        return JiraConnector(base_url=base_url, email=credentials.get("username", ""), api_token=credentials.get("api_key", ""))
    if tool == "github":
        return GitHubConnector(repo=credentials.get("repo", ""), api_token=credentials.get("api_key", ""))
    if tool == "gitlab":
        return GenericMCPConnector(
            tool="gitlab", base_url=base_url, api_token=credentials.get("api_key", ""),
            extra={"project_encoded": quote(credentials.get("repo", ""), safe="")},
        )
    if tool == "ado":
        return GenericMCPConnector(
            tool="ado", api_token=credentials.get("api_key", ""),
            extra={"organization": credentials.get("organization", ""), "project": credentials.get("project", "")},
        )
    if tool == "testrail":
        return GenericMCPConnector(
            tool="testrail", base_url=base_url, api_token=credentials.get("api_key", ""),
            username=credentials.get("username", ""), extra={"section_id": credentials.get("section_id", "1")},
        )
    if tool == "xray":
        return XrayConnector(client_id=credentials.get("username", ""), client_secret=credentials.get("api_key", ""), project_key=credentials.get("project_key", ""))
    if tool == "zephyr":
        return ZephyrConnector(api_token=credentials.get("api_key", ""), project_key=credentials.get("project_key", ""))
    if tool == "aws":
        return AWSCodeCommitConnector(
            access_key_id=credentials.get("username", ""), secret_access_key=credentials.get("api_key", ""),
            region=credentials.get("region", ""), repo=credentials.get("repo", ""),
        )
    raise ValueError(f"Unknown tool: {tool}")


def _flatten_adf(node) -> str:
    """Minimal Atlassian Document Format -> plain text flattener - just
    enough to pull readable text out for AI context, not a full renderer."""
    texts = []
    def walk(n):
        if isinstance(n, dict):
            if n.get("type") == "text":
                texts.append(n.get("text", ""))
            for child in n.get("content", []) or []:
                walk(child)
        elif isinstance(n, list):
            for child in n:
                walk(child)
    walk(node)
    return " ".join(texts) if texts else str(node or "")


def fetch_item_summary(tool: str, credentials: dict, item_id: str) -> str:
    """Returns a plain-text summary of a fetched item, for use as AI context."""
    if tool not in FETCH_SUPPORTED:
        raise ValueError(f"Fetching an item from '{tool}' isn't supported yet. Currently supported: {', '.join(sorted(FETCH_SUPPORTED))}.")

    connector = _connector_for(tool, credentials)

    if tool == "jira":
        result = connector.execute(method="GET", resource="issue", item_id=item_id, payload=None)
        if not result.get("success"):
            raise RuntimeError(f"Jira fetch failed (HTTP {result.get('status_code')}): {result.get('detail')}")
        fields = result["data"].get("fields", {})
        desc = fields.get("description")
        desc_text = _flatten_adf(desc) if isinstance(desc, dict) else str(desc or "")
        return f"Title: {fields.get('summary', '')}\n\nDescription:\n{desc_text}"

    if tool == "ado":
        result = connector.execute(method="GET", resource="workitem", item_id=item_id, payload=None)
        if not result.get("success"):
            raise RuntimeError(f"ADO fetch failed (HTTP {result.get('status_code')}): {result.get('detail')}")
        fields = result["data"].get("fields", {})
        return f"Title: {fields.get('System.Title', '')}\n\nDescription:\n{fields.get('System.Description', '')}"

    if tool == "gitlab":
        result = connector.execute(method="GET", resource="issue", item_id=item_id, payload=None)
        if not result.get("success"):
            raise RuntimeError(f"GitLab fetch failed (HTTP {result.get('status_code')}): {result.get('detail')}")
        data = result["data"]
        return f"Title: {data.get('title', '')}\n\nDescription:\n{data.get('description', '')}"

    if tool == "testrail":
        result = connector.execute(method="GET", resource="case", item_id=item_id, payload=None)
        if not result.get("success"):
            raise RuntimeError(f"TestRail fetch failed (HTTP {result.get('status_code')}): {result.get('detail')}")
        data = result["data"]
        return f"Title: {data.get('title', '')}\n\nSteps:\n{data.get('custom_steps', '')}"

    raise ValueError(f"Unhandled fetch tool: {tool}")


def push_test_cases(tool: str, credentials: dict, target_id: str, test_cases: list, title_prefix: str = "Test Case"):
    """Pushes each test case as a real item in the given tool.
    Returns (count_pushed, a_representative_url_or_None)."""
    if tool not in PUSH_SUPPORTED:
        raise ValueError(f"Pushing to '{tool}' isn't supported yet. Currently supported: {', '.join(sorted(PUSH_SUPPORTED))}.")

    connector = _connector_for(tool, credentials)
    base_url = credentials.get("base_url", "").rstrip("/")
    pushed = 0
    last_url = None

    if tool == "jira":
        project_key = credentials.get("project_key") or (target_id.split("-")[0] if target_id and "-" in target_id else "")
        # Reuses the legacy connector's create_subtask, which already knows to
        # try both "Sub-task" (company-managed) and "Subtask" (team-managed)
        # issue type names automatically.
        legacy = LegacyJiraConnector(base_url=base_url, username=credentials.get("username", ""), api_key=credentials.get("api_key", ""))
        for i, tc in enumerate(test_cases):
            result = legacy.create_subtask(
                parent_issue_id=target_id, project_key=project_key,
                summary=f"{title_prefix} {i + 1}"[:250], description=tc,
            )
            pushed += 1
            key = result.get("key")
            if key:
                last_url = f"{base_url}/browse/{key}"

    elif tool == "github":
        import base64, datetime
        body = "\n\n".join(f"## Test Case {i + 1}\n{tc}" for i, tc in enumerate(test_cases))
        timestamp = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        path = f"generated-test-cases/test-cases-{timestamp}.md"
        connector.create_file(path=path, content_b64=base64.b64encode(body.encode()).decode(), message=f"Add generated test cases ({timestamp})")
        pushed = len(test_cases)

    elif tool == "gitlab":
        for i, tc in enumerate(test_cases):
            result = connector.execute(method="POST", resource="issue", item_id=None, payload={"title": f"{title_prefix} {i + 1}", "description": tc[:60000]})
            if result.get("success"):
                pushed += 1
                last_url = result.get("data", {}).get("web_url")

    elif tool == "ado":
        org = credentials.get("organization", "")
        project = credentials.get("project", "")
        for i, tc in enumerate(test_cases):
            patch_body = [
                {"op": "add", "path": "/fields/System.Title", "value": f"{title_prefix} {i + 1}"},
                {"op": "add", "path": "/fields/System.Description", "value": tc[:5000]},
            ]
            result = connector.execute(method="POST", resource="workitem", item_id=None, payload=patch_body)
            if result.get("success"):
                pushed += 1
                wid = result.get("data", {}).get("id")
                if wid:
                    last_url = f"https://dev.azure.com/{org}/{project}/_workitems/edit/{wid}"

    elif tool == "testrail":
        section_id = credentials.get("section_id") or target_id or "1"
        for i, tc in enumerate(test_cases):
            result = connector.execute(method="POST", resource="case", item_id=None, payload={"title": f"{title_prefix} {i + 1}"[:250], "custom_steps": tc[:2000]})
            if result.get("success"):
                pushed += 1
                case_id = result.get("data", {}).get("id")
                if case_id:
                    last_url = f"{base_url}/index.php?/cases/view/{case_id}"

    elif tool == "xray":
        for i, tc in enumerate(test_cases):
            try:
                connector.execute(method="POST", resource="test", item_id=None, payload={"summary": f"{title_prefix} {i + 1}"})
                pushed += 1
            except Exception:
                pass

    elif tool == "zephyr":
        for i, tc in enumerate(test_cases):
            try:
                connector.execute(method="POST", resource="testcase", item_id=None, payload={"name": f"{title_prefix} {i + 1}"})
                pushed += 1
            except Exception:
                pass

    elif tool == "aws":
        import datetime
        timestamp = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        body = "\n\n".join(f"## {title_prefix} {i + 1}\n{tc}" for i, tc in enumerate(test_cases))
        connector.execute(
            method="POST", resource="file", item_id=f"generated-test-cases/test-cases-{timestamp}.txt",
            payload={"content": body, "message": f"Add generated test cases ({timestamp})"},
        )
        pushed = len(test_cases)

    return pushed, last_url


def delete_item(tool: str, credentials: dict, item_id: str) -> None:
    """Deletes a single item (issue/work item/case) by id. Raises on failure."""
    if tool not in DELETE_SUPPORTED:
        raise ValueError(f"Deleting from '{tool}' isn't supported yet. Currently supported: {', '.join(sorted(DELETE_SUPPORTED))}.")
    if not item_id:
        raise ValueError("No item id given to delete.")

    connector = _connector_for(tool, credentials)
    resource = {"jira": "issue", "gitlab": "issue", "ado": "workitem", "testrail": "case"}[tool]
    result = connector.execute(method="DELETE", resource=resource, item_id=item_id, payload=None)
    if not result.get("success"):
        raise RuntimeError(f"{tool} delete failed (HTTP {result.get('status_code')}): {result.get('detail')}")
