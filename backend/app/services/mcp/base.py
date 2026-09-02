"""
Every MCP tool connector (Jira, GitHub, ADO, TestRail, Xray, Zephyr, GitLab...)
implements this same shape:

    execute(method, resource, item_id, payload) -> dict

`method` is a plain HTTP verb: GET, POST, PUT, PATCH, DELETE.
`resource` is a tool-specific noun, e.g. "issue", "workitem", "testcase".
`item_id` is the ID being acted on (None for creating something new).
`payload` is the JSON body for POST/PUT/PATCH.

This uniform shape is what lets the agent executor say "do a DELETE on
Jira issue QA-123" without needing to know Jira's exact REST schema -
that knowledge lives inside JiraConnector itself.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class BaseMCPConnector(ABC):
    tool_name: str = "base"

    @abstractmethod
    def execute(
        self,
        method: str,
        resource: str,
        item_id: Optional[str],
        payload: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        ...


# --- Natural-language intent parsing -----------------------------------
# Maps the verbs a person naturally uses in a workflow prompt to the HTTP
# method that should be executed against the connected MCP tool.

_DELETE_WORDS = ["delete", "remove", "erase", "discard"]
_CREATE_WORDS = ["create", "add", "attach", "open a new", "file a new", "raise a"]
_UPDATE_WORDS = ["update", "change", "modify", "edit", "set the", "mark as", "transition"]
_READ_WORDS = ["get", "fetch", "show", "read", "retrieve", "pull", "list"]


def infer_method_from_instruction(instruction: str) -> str:
    """Best-effort mapping of an instruction's verb to an HTTP method.
    Defaults to GET (the safest action) if nothing matches."""
    lowered = instruction.lower()
    if any(w in lowered for w in _DELETE_WORDS):
        return "DELETE"
    if any(w in lowered for w in _UPDATE_WORDS):
        return "PATCH"
    if any(w in lowered for w in _CREATE_WORDS):
        return "POST"
    if any(w in lowered for w in _READ_WORDS):
        return "GET"
    return "GET"
