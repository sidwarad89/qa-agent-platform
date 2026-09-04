"""Azure DevOps REST API connector.
Docs: https://learn.microsoft.com/en-us/rest/api/azure/devops/
"""
import httpx
import base64


class ADOConnector:
    def __init__(self, organization: str, project: str, api_key: str):
        self.base_url = f"https://dev.azure.com/{organization}/{project}"
        token = base64.b64encode(f":{api_key}".encode()).decode()
        self.headers = {"Authorization": f"Basic {token}"}

    def validate(self) -> tuple[bool, str]:
        try:
            resp = httpx.get(
                f"{self.base_url}/_apis/wit/workitems?ids=1&api-version=7.1-preview.3",
                headers=self.headers, timeout=10,
            )
            if resp.status_code in (200, 404):  # 404 = reachable, just no item #1
                return True, "Azure DevOps credentials valid."
            if resp.status_code in (401, 403):
                return False, "Invalid Azure DevOps PAT."
            return False, f"ADO validation failed: HTTP {resp.status_code}"
        except Exception as exc:  # noqa: BLE001
            return False, f"Could not reach Azure DevOps: {exc}"

    def get_work_item(self, work_item_id: str) -> dict:
        resp = httpx.get(
            f"{self.base_url}/_apis/wit/workitems/{work_item_id}?api-version=7.1-preview.3",
            headers=self.headers, timeout=15,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"ADO get_work_item failed (HTTP {resp.status_code}): {resp.text[:500]}")
        return resp.json()
