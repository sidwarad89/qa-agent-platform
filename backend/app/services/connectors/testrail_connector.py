"""TestRail REST API connector.
Docs: https://support.testrail.com/hc/en-us/sections/7076808289044-API
"""
import httpx


class TestRailConnector:
    def __init__(self, base_url: str, username: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.auth = (username, api_key)

    def validate(self) -> tuple[bool, str]:
        try:
            resp = httpx.get(f"{self.base_url}/index.php?/api/v2/get_projects", auth=self.auth, timeout=10)
            if resp.status_code == 200:
                return True, "TestRail credentials valid."
            if resp.status_code in (401, 403):
                return False, "Invalid TestRail username or API key."
            return False, f"TestRail validation failed: HTTP {resp.status_code}"
        except Exception as exc:  # noqa: BLE001
            return False, f"Could not reach TestRail: {exc}"

    def add_case(self, section_id: str, title: str, steps: str, priority_id: int = 2) -> dict:
        payload = {"title": title, "custom_steps": steps, "priority_id": priority_id}
        resp = httpx.post(
            f"{self.base_url}/index.php?/api/v2/add_case/{section_id}",
            json=payload, auth=self.auth, timeout=15,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"TestRail add_case failed (HTTP {resp.status_code}): {resp.text[:500]}")
        return resp.json()
