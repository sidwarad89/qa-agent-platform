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
        if resp.status_code >= 400:
            raise RuntimeError(f"GitHub create_file failed (HTTP {resp.status_code}): {resp.text[:500]}")
        return resp.json()

    def get_file_content(self, path: str, branch: str = "main") -> str:
        """Returns the decoded text content of a file already in the repo."""
        import base64
        resp = httpx.get(
            f"https://api.github.com/repos/{self.repo}/contents/{path}",
            headers=self.headers, params={"ref": branch}, timeout=15,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"GitHub get_file_content failed (HTTP {resp.status_code}): {resp.text[:500]}")
        data = resp.json()
        return base64.b64decode(data["content"]).decode("utf-8", errors="replace")

    def list_directory(self, path: str, branch: str = "main") -> list[dict]:
        resp = httpx.get(
            f"https://api.github.com/repos/{self.repo}/contents/{path}",
            headers=self.headers, params={"ref": branch}, timeout=15,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"GitHub list_directory failed (HTTP {resp.status_code}): {resp.text[:500]}")
        data = resp.json()
        return data if isinstance(data, list) else [data]

    def create_branch(self, new_branch: str, from_branch: str = "main") -> dict:
        """Creates a new branch pointing at from_branch's current HEAD.
        Safe to call even if the branch already exists - treated as success."""
        ref_resp = httpx.get(
            f"https://api.github.com/repos/{self.repo}/git/ref/heads/{from_branch}",
            headers=self.headers, timeout=15,
        )
        if ref_resp.status_code >= 400:
            raise RuntimeError(f"GitHub get ref for '{from_branch}' failed (HTTP {ref_resp.status_code}): {ref_resp.text[:500]}")
        sha = ref_resp.json()["object"]["sha"]

        create_resp = httpx.post(
            f"https://api.github.com/repos/{self.repo}/git/refs",
            headers=self.headers, timeout=15,
            json={"ref": f"refs/heads/{new_branch}", "sha": sha},
        )
        if create_resp.status_code >= 400:
            if create_resp.status_code == 422 and "already exists" in create_resp.text:
                return {"already_existed": True, "ref": f"refs/heads/{new_branch}"}
            raise RuntimeError(f"GitHub create_branch failed (HTTP {create_resp.status_code}): {create_resp.text[:500]}")
        return create_resp.json()
