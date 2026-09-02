from typing import Optional, Dict, Any
import httpx

from .base import BaseMCPConnector

AUTH_URL = "https://xray.cloud.getxray.app/api/v2/authenticate"
GRAPHQL_URL = "https://xray.cloud.getxray.app/api/v2/graphql"


class XrayConnector(BaseMCPConnector):
    tool_name = "xray"

    def __init__(self, client_id: str, client_secret: str, project_key: str = ""):
        self.client_id = client_id
        self.client_secret = client_secret
        self.project_key = project_key
        self._token = None

    def _authenticate(self) -> str:
        if self._token:
            return self._token
        resp = httpx.post(AUTH_URL, json={"client_id": self.client_id, "client_secret": self.client_secret}, timeout=20)
        if resp.status_code != 200:
            raise ValueError(f"Xray authentication failed ({resp.status_code}): {resp.text}")
        # Xray returns the token as a raw JSON string, e.g. "eyJhbGciOi..."
        self._token = resp.json().strip('"')
        return self._token

    def validate(self) -> tuple[bool, str]:
        try:
            self._authenticate()
            return True, "Xray Client ID/Secret are valid."
        except Exception as exc:
            return False, str(exc)

    def execute(self, method: str, resource: str, item_id: Optional[str], payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        token = self._authenticate()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        method = method.upper()

        if method == "POST":  # create a Test
            query = """
            mutation CreateTest($projectKey: String!, $summary: String!) {
              createTest(testType: {name: "Generic"}, jira: {fields: {project: {key: $projectKey}, summary: $summary}}) {
                test { issueId jira(fields: ["key"]) }
              }
            }"""
            variables = {"projectKey": self.project_key, "summary": (payload or {}).get("summary", "Generated test")}
        elif method == "DELETE":
            query = "mutation DeleteTest($issueId: String!) { deleteTest(issueId: $issueId) }"
            variables = {"issueId": item_id}
        elif method == "GET":
            query = """
            query GetTests($jql: String!) {
              getTests(jql: $jql, limit: 10) { results { issueId jira(fields: ["key", "summary"]) } }
            }"""
            variables = {"jql": f"project = {self.project_key}"}
        else:
            raise ValueError(f"Unsupported method {method} for Xray.")

        with httpx.Client(headers=headers, timeout=30) as client:
            resp = client.post(GRAPHQL_URL, json={"query": query, "variables": variables})

        if resp.status_code >= 400:
            return {"success": False, "status_code": resp.status_code, "detail": resp.text}
        data = resp.json()
        if data.get("errors"):
            return {"success": False, "status_code": 400, "detail": str(data["errors"])}
        return {"success": True, "status_code": resp.status_code, "data": data.get("data")}
