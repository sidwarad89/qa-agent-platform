from typing import Optional, Dict, Any
import httpx

from .base import BaseMCPConnector


class JiraConnector(BaseMCPConnector):
    tool_name = "jira"

    def __init__(self, base_url: str, email: str, api_token: str):
        self.base_url = base_url.rstrip("/")
        self.auth = (email, api_token)

    def validate(self) -> tuple[bool, str]:
        try:
            with httpx.Client(auth=self.auth, timeout=20) as client:
                resp = client.get(f"{self.base_url}/rest/api/3/myself")
            if resp.status_code == 200:
                name = resp.json().get("displayName", "your account")
                return True, f"Connected as {name}."
            if resp.status_code == 401:
                return False, "Invalid email or API token."
            return False, f"Unexpected response ({resp.status_code}): {resp.text[:200]}"
        except Exception as exc:
            return False, str(exc)

    def execute(self, method: str, resource: str, item_id: Optional[str], payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        method = method.upper()

        if resource in ("issue", "story", "bug", "task", "subtask"):
            return self._issue(method, item_id, payload)
        if resource == "comment":
            return self._comment(method, item_id, payload)

        raise ValueError(f"Jira connector doesn't yet know how to handle resource '{resource}'.")

    def _issue(self, method: str, item_id: Optional[str], payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        url = f"{self.base_url}/rest/api/3/issue"
        with httpx.Client(auth=self.auth, timeout=30) as client:
            if method == "GET":
                resp = client.get(f"{url}/{item_id}")
            elif method == "POST":
                resp = client.post(url, json=payload)
            elif method in ("PUT", "PATCH"):
                resp = client.put(f"{url}/{item_id}", json=payload)
            elif method == "DELETE":
                resp = client.delete(f"{url}/{item_id}")
            else:
                raise ValueError(f"Unsupported method {method} for Jira issue.")

        if resp.status_code >= 400:
            return {"success": False, "status_code": resp.status_code, "detail": resp.text}
        data = resp.json() if resp.text else {"success": True}
        return {"success": True, "status_code": resp.status_code, "data": data}

    def _comment(self, method: str, item_id: Optional[str], payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        # item_id here is the parent issue key
        url = f"{self.base_url}/rest/api/3/issue/{item_id}/comment"
        with httpx.Client(auth=self.auth, timeout=30) as client:
            if method == "POST":
                resp = client.post(url, json=payload)
            elif method == "GET":
                resp = client.get(url)
            else:
                raise ValueError(f"Unsupported method {method} for Jira comment.")

        if resp.status_code >= 400:
            return {"success": False, "status_code": resp.status_code, "detail": resp.text}
        return {"success": True, "status_code": resp.status_code, "data": resp.json() if resp.text else {}}
