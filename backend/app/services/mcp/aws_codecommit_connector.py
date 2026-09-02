import base64
from typing import Optional, Dict, Any

from .base import BaseMCPConnector


class AWSCodeCommitConnector(BaseMCPConnector):
    tool_name = "aws"

    def __init__(self, access_key_id: str, secret_access_key: str, region: str, repo: str):
        import boto3  # imported lazily so the whole app doesn't require boto3 unless AWS is used
        self.repo = repo
        self.client = boto3.client(
            "codecommit", region_name=region,
            aws_access_key_id=access_key_id, aws_secret_access_key=secret_access_key,
        )

    def validate(self) -> tuple[bool, str]:
        try:
            info = self.client.get_repository(repositoryName=self.repo)
            return True, f"Connected to {info['repositoryMetadata']['repositoryName']}."
        except Exception as exc:
            return False, str(exc)

    def _branch_head_commit(self, branch: str = "main") -> str:
        try:
            return self.client.get_branch(repositoryName=self.repo, branchName=branch)["branch"]["commitId"]
        except Exception:
            # fall back to master for older repos
            return self.client.get_branch(repositoryName=self.repo, branchName="master")["branch"]["commitId"]

    def execute(self, method: str, resource: str, item_id: Optional[str], payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        method = method.upper()
        file_path = item_id  # item_id is the file path within the repo

        try:
            if method == "GET":
                commit_id = self._branch_head_commit()
                result = self.client.get_file(repositoryName=self.repo, filePath=file_path, commitSpecifier=commit_id)
                content = base64.b64decode(result["fileContent"]).decode(errors="replace")
                return {"success": True, "status_code": 200, "data": {"path": file_path, "content": content}}

            if method in ("POST", "PUT", "PATCH"):
                parent_commit = self._branch_head_commit()
                content = (payload or {}).get("content", "")
                result = self.client.create_commit(
                    repositoryName=self.repo, branchName="main", parentCommitId=parent_commit,
                    commitMessage=(payload or {}).get("message", "Updated via QA Agent Platform"),
                    putFiles=[{"filePath": file_path, "fileContent": content.encode()}],
                )
                return {"success": True, "status_code": 200, "data": {"commitId": result["commitId"]}}

            if method == "DELETE":
                parent_commit = self._branch_head_commit()
                result = self.client.create_commit(
                    repositoryName=self.repo, branchName="main", parentCommitId=parent_commit,
                    commitMessage="Deleted via QA Agent Platform",
                    deleteFiles=[{"filePath": file_path}],
                )
                return {"success": True, "status_code": 200, "data": {"commitId": result["commitId"]}}

            raise ValueError(f"Unsupported method {method} for AWS CodeCommit.")

        except Exception as exc:
            return {"success": False, "status_code": 502, "detail": str(exc)}
