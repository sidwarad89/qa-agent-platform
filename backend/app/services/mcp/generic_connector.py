from typing import Optional, Dict, Any
import httpx

from .base import BaseMCPConnector

TOOL_CONFIGS: Dict[str, Dict[str, Any]] = {
    "ado": {
        "base_path": "https://dev.azure.com/{organization}/{project}/_apis/wit/workitems",
        "auth_type": "basic_pat",       # PAT goes in the password field, blank username
        "id_suffix": "/{item_id}?api-version=7.1",
        "create_suffix": "/$Task?api-version=7.1",
        "content_type": "application/json-patch+json",  # ADO PATCH bodies use JSON Patch format
        "validate_path": "https://dev.azure.com/{organization}/_apis/projects?api-version=7.1",
    },
    "testrail": {
        "base_path": "{base_url}/index.php?/api/v2",
        "auth_type": "basic",
        "get_path": "/get_case/{item_id}",
        "create_path": "/add_case/{section_id}",
        "update_path": "/update_case/{item_id}",
        "delete_path": "/delete_case/{item_id}",
        "validate_path": "{base_url}/index.php?/api/v2/get_projects",
    },
    "gitlab": {
        "base_path": "{base_url}/api/v4/projects/{project_encoded}/issues",
        "auth_type": "bearer",
        "id_suffix": "/{item_id}",
        "validate_path": "{base_url}/api/v4/user",
    },
}


class GenericMCPConnector(BaseMCPConnector):
    """Config-driven connector for tools that share a simple REST + validate shape."""

    def __init__(self, tool: str, base_url: str = "", api_token: str = "", username: str = "", extra: Optional[Dict[str, Any]] = None):
        if tool not in TOOL_CONFIGS:
            raise ValueError(f"No generic MCP config found for tool '{tool}'.")
        self.tool_name = tool
        self.config = TOOL_CONFIGS[tool]
        self.base_url = base_url.rstrip("/")
        self.api_token = api_token
        self.username = username
        self.extra = extra or {}

    def _auth(self):
        auth_type = self.config["auth_type"]
        if auth_type == "basic_pat":
            return ("", self.api_token)
        if auth_type == "basic":
            return (self.username, self.api_token)
        return None  # bearer handled via headers instead

    def _headers(self):
        if self.config["auth_type"] == "bearer":
            return {"Authorization": f"Bearer {self.api_token}", "Content-Type": "application/json"}
        return {"Content-Type": self.config.get("content_type", "application/json")}

    def _resolve(self, template: str, item_id: Optional[str] = None) -> str:
        return template.format(
            base_url=self.base_url,
            item_id=item_id or "",
            **self.extra,
        )

    def validate(self) -> tuple[bool, str]:
        validate_path = self.config.get("validate_path")
        if not validate_path:
            return False, "No validation check available for this tool yet."
        try:
            url = self._resolve(validate_path)
            with httpx.Client(auth=self._auth(), headers=self._headers(), timeout=20) as client:
                resp = client.get(url)
            if resp.status_code == 200:
                return True, "Credentials look valid."
            if resp.status_code in (401, 403):
                return False, "Invalid credentials or insufficient permissions."
            return False, f"Unexpected response ({resp.status_code}): {resp.text[:200]}"
        except Exception as exc:
            return False, str(exc)

    def execute(self, method: str, resource: str, item_id: Optional[str], payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        method = method.upper()
        base = self._resolve(self.config["base_path"], item_id)

        if method == "GET":
            path = self.config.get("get_path", self.config.get("id_suffix", ""))
        elif method == "POST":
            path = self.config.get("create_path", "")
        elif method in ("PUT", "PATCH"):
            path = self.config.get("update_path", self.config.get("id_suffix", ""))
        elif method == "DELETE":
            path = self.config.get("delete_path", self.config.get("id_suffix", ""))
        else:
            raise ValueError(f"Unsupported method {method}.")

        url = base + self._resolve(path, item_id)

        with httpx.Client(auth=self._auth(), headers=self._headers(), timeout=30) as client:
            if method == "GET":
                resp = client.get(url)
            elif method == "POST":
                resp = client.post(url, json=payload)
            elif method in ("PUT", "PATCH"):
                resp = client.request(method, url, json=payload)
            elif method == "DELETE":
                resp = client.delete(url)

        if resp.status_code >= 400:
            return {"success": False, "status_code": resp.status_code, "detail": resp.text}
        return {"success": True, "status_code": resp.status_code, "data": resp.json() if resp.text else {}}
