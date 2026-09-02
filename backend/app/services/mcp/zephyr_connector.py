from typing import Optional, Dict, Any
import httpx

from .base import BaseMCPConnector

# Zephyr Scale Cloud always lives here - NOT under the customer's Jira domain.
BASE_URL = "https://api.zephyrscale.smartbear.com/v2"


class ZephyrConnector(BaseMCPConnector):
    tool_name = "zephyr"

    def __init__(self, api_token: str, project_key: str = ""):
        self.api_token = api_token
        self.project_key = project_key
        self.headers = {"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"}

    def validate(self) -> tuple[bool, str]:
        try:
            with httpx.Client(headers=self.headers, timeout=20) as client:
                resp = client.get(f"{BASE_URL}/testcases", params={"projectKey": self.project_key, "maxResults": 1})
            if resp.status_code == 200:
                return True, "Zephyr Scale API token is valid."
            if resp.status_code == 401:
                return False, "Invalid Zephyr Scale API token."
            return False, f"Unexpected response ({resp.status_code}): {resp.text[:200]}"
        except Exception as exc:
            return False, str(exc)

    def execute(self, method: str, resource: str, item_id: Optional[str], payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        method = method.upper()
        url = f"{BASE_URL}/testcases"

        with httpx.Client(headers=self.headers, timeout=30) as client:
            if method == "GET":
                resp = client.get(f"{url}/{item_id}" if item_id else url, params={"projectKey": self.project_key})
            elif method == "POST":
                body = {"projectKey": self.project_key, "name": (payload or {}).get("name", "Generated test case")}
                resp = client.post(url, json=body)
            elif method in ("PUT", "PATCH"):
                resp = client.put(f"{url}/{item_id}", json=payload)
            elif method == "DELETE":
                # Zephyr Scale Cloud's public REST API does not expose a delete-test-case
                # endpoint as of this writing - surfaced clearly rather than silently no-op'ing.
                return {"success": False, "status_code": 501, "detail": "Zephyr Scale Cloud API does not support deleting test cases."}
            else:
                raise ValueError(f"Unsupported method {method} for Zephyr Scale.")

        if resp.status_code >= 400:
            return {"success": False, "status_code": resp.status_code, "detail": resp.text}
        return {"success": True, "status_code": resp.status_code, "data": resp.json() if resp.text else {}}
