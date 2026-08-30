"""GitHub REST API connector.
Docs: https://docs.github.com/en/rest
"""
import httpx


class GitHubConnector:
    def __init__(self, repo: str, api_key: str):
        self.repo = repo  # "owner/repo"
        self.headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/vnd.github+json"}

    def validate(self) -> tuple[bool, str]:
        try:
            resp = httpx.get(f"https://api.github.com/repos/{self.repo}", headers=self.headers, timeout=10)
            if resp.status_code == 200:
                return True, "GitHub credentials valid."
            if resp.status_code in (401, 403):
                return False, "Invalid GitHub token."
            if resp.status_code == 404:
                return False, "Repo not found or token lacks access."
            return False, f"GitHub validation failed: HTTP {resp.status_code}"
        except Exception as exc:  # noqa: BLE001
            return False, f"Could not reach GitHub: {exc}"

    def create_file(self, path: str, content_b64: str, message: str, branch: str = "main") -> dict:
        resp = httpx.put(
            f"https://api.github.com/repos/{self.repo}/contents/{path}",
            headers=self.headers, timeout=15,
            json={"message": message, "content": content_b64, "branch": branch},
        )
        resp.raise_for_status()
        return resp.json()
