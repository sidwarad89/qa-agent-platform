"""Jira REST API connector.
Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
"""
import httpx


class JiraConnector:
    def __init__(self, base_url: str, username: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.auth = (username, api_key)

    def validate(self) -> tuple[bool, str]:
        try:
            resp = httpx.get(f"{self.base_url}/rest/api/3/myself", auth=self.auth, timeout=10)
            if resp.status_code == 200:
                return True, "Jira credentials valid."
            if resp.status_code in (401, 403):
                return False, "Invalid Jira username or API token."
            return False, f"Jira validation failed: HTTP {resp.status_code}"
        except Exception as exc:  # noqa: BLE001
            return False, f"Could not reach Jira: {exc}"

    def get_issue(self, issue_id: str) -> dict:
        resp = httpx.get(f"{self.base_url}/rest/api/3/issue/{issue_id}", auth=self.auth, timeout=15)
        if resp.status_code >= 400:
            raise RuntimeError(f"Jira GET issue failed (HTTP {resp.status_code}): {resp.text[:500]}")
        return resp.json()

    def delete_issue(self, issue_id: str) -> None:
        resp = httpx.delete(f"{self.base_url}/rest/api/3/issue/{issue_id}", auth=self.auth, timeout=15)
        if resp.status_code >= 400:
            raise RuntimeError(f"Jira DELETE issue {issue_id} failed (HTTP {resp.status_code}): {resp.text[:500]}")

    def create_subtask(self, parent_issue_id: str, project_key: str, summary: str, description: str) -> dict:
        def _attempt(issuetype_name: str):
            payload = {
                "fields": {
                    "project": {"key": project_key},
                    "parent": {"key": parent_issue_id},
                    "summary": summary,
                    "description": {
                        "type": "doc", "version": 1,
                        "content": [{"type": "paragraph", "content": [{"type": "text", "text": description}]}],
                    },
                    "issuetype": {"name": issuetype_name},
                }
            }
            return httpx.post(f"{self.base_url}/rest/api/3/issue", json=payload, auth=self.auth, timeout=15)

        # Company-managed Jira projects call it "Sub-task"; team-managed
        # projects call the identical concept "Subtask" (no hyphen). Try
        # both automatically instead of making the user figure out which.
        resp = _attempt("Sub-task")
        if resp.status_code >= 400:
            resp2 = _attempt("Subtask")
            if resp2.status_code < 400:
                return resp2.json()
            raise RuntimeError(
                f"Jira create subtask failed (HTTP {resp.status_code}) with 'Sub-task', "
                f"and (HTTP {resp2.status_code}) with 'Subtask'. Response: {resp2.text[:500]}"
            )
        return resp.json()
