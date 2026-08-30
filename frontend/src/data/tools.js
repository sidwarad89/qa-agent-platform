// Every tool defines its own credential form fields (so the UI can render
// generically) plus a "how do I get this token" walkthrough.

const jiraFields = [
  { key: 'base_url', label: 'Jira Base URL', mask: false, placeholder: 'https://yourorg.atlassian.net' },
  { key: 'username', label: 'Username / Email', mask: false, placeholder: 'you@company.com' },
  { key: 'api_key', label: 'API Token', mask: true, placeholder: '' },
  { key: 'project_key', label: 'Project Key', mask: false, placeholder: 'e.g. QA' },
  { key: 'item_id', label: 'Issue / Story ID', mask: false, placeholder: 'e.g. QA-123' },
]

const jiraSteps = [
  'Log in to your Atlassian account, then go to id.atlassian.com/manage-profile/security/api-tokens.',
  'Click "Create API token", give it a label (e.g. "QA-Agent"), and click "Create".',
  'Copy the token shown — Atlassian will not display it again.',
  'Your "Username" is the email you use to log into Jira; the token acts as your password for API calls.',
  'Find your Project Key on the Jira project settings page (e.g. "QA" in issue QA-123).',
]

const adoFields = [
  { key: 'organization', label: 'Organization', mask: false, placeholder: 'e.g. contoso' },
  { key: 'project', label: 'Project', mask: false, placeholder: 'e.g. QA-Platform' },
  { key: 'api_key', label: 'Personal Access Token (PAT)', mask: true, placeholder: '' },
  { key: 'item_id', label: 'Work Item ID', mask: false, placeholder: 'e.g. 4821' },
]

const adoSteps = [
  'Sign in to dev.azure.com and open your organization.',
  'Click the "User settings" icon (top right) → "Personal access tokens".',
  'Click "New Token", name it, set an expiry, and under Scopes pick "Work Items (Read & Write)".',
  'Click "Create" and copy the token immediately — it is shown only once.',
  'Your "Organization" is the name in the URL (dev.azure.com/<organization>).',
]

const testrailFields = [
  { key: 'base_url', label: 'TestRail Base URL', mask: false, placeholder: 'https://yourorg.testrail.io' },
  { key: 'username', label: 'Username / Email', mask: false, placeholder: 'you@company.com' },
  { key: 'api_key', label: 'API Key', mask: true, placeholder: '' },
  { key: 'section_id', label: 'Section ID', mask: false, placeholder: 'e.g. 12' },
]

const testrailSteps = [
  'Log in to your TestRail instance as a user with API access enabled.',
  'Go to "My Settings" (top right avatar menu) → "API Keys" tab.',
  'Click "Add Key", give it a name, and click "Add".',
  'Copy the generated key — this is your "API Key" below (used together with your login email).',
  'Find the Section ID by opening the target Test Suite → Sections; the ID is in the URL or via "Edit Section".',
]

const githubFields = [
  { key: 'repo', label: 'Repo (owner/repo)', mask: false, placeholder: 'yourorg/yourrepo' },
  { key: 'api_key', label: 'Personal Access Token', mask: true, placeholder: '' },
]

const githubSteps = [
  'Go to github.com/settings/tokens (or Settings → Developer settings → Personal access tokens).',
  'Click "Generate new token" → "Fine-grained token" (recommended) or "Tokens (classic)".',
  'Select the repository this agent should access, and grant "Contents" + "Issues" read/write scopes.',
  'Click "Generate token" and copy it immediately — GitHub only shows it once.',
  'The "Repo" field is the owner/repository combination shown in the repo URL, e.g. octocat/hello-world.',
]

const gitlabFields = [
  { key: 'repo', label: 'Project (namespace/repo)', mask: false, placeholder: 'yourorg/yourrepo' },
  { key: 'base_url', label: 'GitLab Base URL', mask: false, placeholder: 'https://gitlab.com' },
  { key: 'api_key', label: 'Personal Access Token', mask: true, placeholder: '' },
]

const gitlabSteps = [
  'Log in to GitLab and go to Avatar → Edit profile → "Access Tokens".',
  'Click "Add new token", name it, set an expiry, and select the "api" scope.',
  'Click "Create personal access token" and copy the value shown.',
  'Self-managed GitLab? Put its URL in "GitLab Base URL", otherwise leave the default gitlab.com.',
]

const xrayFields = [
  { key: 'base_url', label: 'Xray/Jira Base URL', mask: false, placeholder: 'https://yourorg.atlassian.net' },
  { key: 'api_key', label: 'Client Secret / API Token', mask: true, placeholder: '' },
  { key: 'username', label: 'Client ID / Username', mask: false, placeholder: '' },
]

const xraySteps = [
  'In Jira, open the Xray app → "API Keys" (Global Settings).',
  'Click "Create API Key" to generate a Client ID and Client Secret pair.',
  'Copy both values — the Client Secret is shown only once.',
  'Use the Client ID as "Username" and the Client Secret as the token field below.',
]

const zephyrFields = [
  { key: 'base_url', label: 'Zephyr/Jira Base URL', mask: false, placeholder: 'https://yourorg.atlassian.net' },
  { key: 'api_key', label: 'API Access Token', mask: true, placeholder: '' },
]

const zephyrSteps = [
  'Open Zephyr Scale in Jira → click your avatar → "API Access Tokens".',
  'Click "Create new token", label it, and confirm.',
  'Copy the token immediately — Zephyr will not show it again.',
  'Paste it into the API Access Token field below.',
]

export const INPUT_TOOLS = [
  { id: 'jira', label: 'Jira', fields: jiraFields, steps: jiraSteps },
  { id: 'ado', label: 'Azure DevOps', fields: adoFields, steps: adoSteps },
  { id: 'xray', label: 'Xray', fields: xrayFields, steps: xraySteps },
  { id: 'zephyr', label: 'Zephyr Scale', fields: zephyrFields, steps: zephyrSteps },
]

export const OUTPUT_TOOLS = [
  { id: 'testrail', label: 'TestRail', fields: testrailFields, steps: testrailSteps },
  { id: 'jira', label: 'Jira', fields: jiraFields.slice(0, 3), steps: jiraSteps },
  { id: 'ado', label: 'Azure DevOps', fields: adoFields.slice(0, 3), steps: adoSteps },
  { id: 'github', label: 'GitHub Repo', fields: githubFields, steps: githubSteps },
  { id: 'gitlab', label: 'GitLab Repo', fields: gitlabFields, steps: gitlabSteps },
  { id: 'xray', label: 'Xray', fields: xrayFields, steps: xraySteps },
]

export function getToolDef(list, id) {
  return list.find((t) => t.id === id)
}
