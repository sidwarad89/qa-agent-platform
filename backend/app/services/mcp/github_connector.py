import base64
from typing import Optional, Dict, Any
import httpx

from .base import BaseMCPConnector


class GitHubConnector(BaseMCPConnector):
    tool_name = "github"

    def __init__(self, repo: str, api_token: str):
        self.repo = repo  # "owner/repo"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Accept": "application/vnd.github+json",
        }
        self.base_url = "https://api.github.com"

    def validate(self) -> tuple[bool, str]:
        try:
            with httpx.Client(headers=self.headers, timeout=20) as client:
                user_resp = client.get(f"{self.base_url}/user")
                if user_resp.status_code == 401:
                    return False, "Invalid personal access token."
                if user_resp.status_code != 200:
                    return False, f"Unexpected response ({user_resp.status_code})."
                if self.repo:
                    repo_resp = client.get(f"{self.base_url}/repos/{self.repo}")
                    if repo_resp.status_code == 404:
                        return False, f"Token is valid, but repo '{self.repo}' wasn't found or isn't accessible."
                login = user_resp.json().get("login", "your account")
            return True, f"Connected as {login}."
        except Exception as exc:
            return False, str(exc)

    def execute(self, method: str, resource: str, item_id: Optional[str], payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        method = method.upper()
        if resource == "issue":
            return self._issue(method, item_id, payload)
        if resource == "file":
            return self._file(method, item_id, payload)
        raise ValueError(f"GitHub connector doesn't yet know how to handle resource '{resource}'.")

    def _issue(self, method: str, item_id: Optional[str], payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        url = f"{self.base_url}/repos/{self.repo}/issues"
        with httpx.Client(headers=self.headers, timeout=30) as client:
            if method == "GET":
                resp = client.get(f"{url}/{item_id}" if item_id else url)
            elif method == "POST":
                resp = client.post(url, json=payload)
            elif method in ("PUT", "PATCH"):
                resp = client.patch(f"{url}/{item_id}", json=payload)
            elif method == "DELETE":
                # GitHub has no true issue delete via API; closing is the equivalent.
                resp = client.patch(f"{url}/{item_id}", json={"state": "closed"})
            else:
                raise ValueError(f"Unsupported method {method} for GitHub issue.")

        if resp.status_code >= 400:
            return {"success": False, "status_code": resp.status_code, "detail": resp.text}
        return {"success": True, "status_code": resp.status_code, "data": resp.json()}

    def _file(self, method: str, item_id: Optional[str], payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        # item_id is the file path within the repo
        url = f"{self.base_url}/repos/{self.repo}/contents/{item_id}"
        with httpx.Client(headers=self.headers, timeout=30) as client:
            if method == "GET":
                resp = client.get(url)
            elif method in ("POST", "PUT", "PATCH"):
                content = payload.get("content", "")
                body = {
                    "message": payload.get("message", "Updated via QA Agent Platform"),
                    "content": base64.b64encode(content.encode()).decode(),
                }
                if payload.get("sha"):
                    body["sha"] = payload["sha"]
                resp = client.put(url, json=body)
            elif method == "DELETE":
                sha = payload.get("sha") if payload else None
                resp = client.request("DELETE", url, json={"message": "Deleted via QA Agent Platform", "sha": sha})
            else:
                raise ValueError(f"Unsupported method {method} for GitHub file.")

        if resp.status_code >= 400:
            return {"success": False, "status_code": resp.status_code, "detail": resp.text}
        return {"success": True, "status_code": resp.status_code, "data": resp.json() if resp.text else {}}
