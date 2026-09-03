export const MCP_TOOLS = [
  {
    id: 'jira',
    label: 'Jira',
    color: '#0052CC',
    description: 'Read, create, update, and delete issues, comments, and project data.',
    scopes: [
      'Read your Jira account information',
      'Access and manage your issues',
      'View and update project details',
      'Read sprint and board data',
    ],
    fields: [
      { key: 'base_url', label: 'Jira Base URL', placeholder: 'https://yourorg.atlassian.net' },
      { key: 'username', label: 'Email', placeholder: 'you@company.com' },
      { key: 'api_key', label: 'API Token', mask: true },
    ],
    steps: [
      'Log in to your Atlassian account, then go to id.atlassian.com/manage-profile/security/api-tokens.',
      'Click "Create API token", give it a label (e.g. "QA-Agent"), and click "Create".',
      'Copy the token shown — Atlassian will not display it again.',
      'Your "Email" is the address you log into Jira with; the token acts as your password for API calls.',
    ],
  },
  {
    id: 'ado',
    label: 'Azure DevOps',
    color: '#0078D4',
    description: 'Full CRUD on work items — bugs, tasks, user stories.',
    scopes: ['Read and write work items', 'Access project and board data'],
    fields: [
      { key: 'organization', label: 'Organization', placeholder: 'e.g. contoso' },
      { key: 'project', label: 'Project', placeholder: 'e.g. QA-Platform' },
      { key: 'api_key', label: 'Personal Access Token', mask: true },
    ],
    steps: [
      'Sign in to dev.azure.com and open your organization.',
      'Click the "User settings" icon (top right) → "Personal access tokens".',
      'Click "New Token", name it, set an expiry, and under Scopes pick "Work Items (Read & Write)".',
      'Click "Create" and copy the token immediately — it is shown only once.',
      'Your "Organization" is the name in the URL: dev.azure.com/<organization>.',
    ],
  },
  {
    id: 'github',
    label: 'GitHub',
    color: '#181717',
    description: 'Manage issues and repo files — create, read, update, close.',
    scopes: ['Read and write repository contents', 'Read and write issues'],
    fields: [
      { key: 'repo', label: 'Repo (owner/repo)', placeholder: 'yourorg/yourrepo' },
      { key: 'api_key', label: 'Personal Access Token', mask: true },
    ],
    steps: [
      'Go to github.com/settings/tokens (or Settings → Developer settings → Personal access tokens).',
      'Click "Generate new token" → "Fine-grained token" (recommended) or "Tokens (classic)".',
      'Select the repository this agent should access, and grant "Contents" + "Issues" read/write scopes.',
      'Click "Generate token" and copy it immediately — GitHub only shows it once.',
      'The "Repo" field is the owner/repository combination shown in the repo URL, e.g. octocat/hello-world.',
    ],
  },
  {
    id: 'gitlab',
    label: 'GitLab',
    color: '#FC6D26',
    description: 'Manage issues across GitLab-hosted projects.',
    scopes: ['Read and write project issues'],
    fields: [
      { key: 'repo', label: 'Project (namespace/repo)', placeholder: 'yourorg/yourrepo' },
      { key: 'base_url', label: 'GitLab Base URL', placeholder: 'https://gitlab.com' },
      { key: 'api_key', label: 'Personal Access Token', mask: true },
    ],
    steps: [
      'Log in to GitLab and go to Avatar → Edit profile → "Access Tokens".',
      'Click "Add new token", name it, set an expiry, and select the "api" scope.',
      'Click "Create personal access token" and copy the value shown.',
      'Self-managed GitLab? Put its URL in "GitLab Base URL", otherwise leave the default gitlab.com.',
    ],
  },
  {
    id: 'testrail',
    label: 'TestRail',
    color: '#5C4EE5',
    description: 'Create, fetch, update, and delete test cases.',
    scopes: ['Read and write test cases', 'Access section and suite data'],
    fields: [
      { key: 'base_url', label: 'TestRail Base URL', placeholder: 'https://yourorg.testrail.io' },
      { key: 'username', label: 'Email', placeholder: 'you@company.com' },
      { key: 'api_key', label: 'API Key', mask: true },
    ],
    steps: [
      'Log in to your TestRail instance as a user with API access enabled.',
      'Go to "My Settings" (top right avatar menu) → "API Keys" tab.',
      'Click "Add Key", give it a name, and click "Add".',
      'Copy the generated key — this is used together with your login email.',
    ],
  },
  {
    id: 'xray',
    label: 'Xray',
    color: '#DE350B',
    // Xray Cloud does NOT use your Jira URL or basic auth - it authenticates
    // separately via Client ID/Secret against xray.cloud.getxray.app, then
    // uses the returned token as a Bearer token for everything else.
    description: 'Manage test entities via Xray Cloud (separate auth from Jira).',
    scopes: ['Read and write tests', 'Access test execution data'],
    fields: [
      { key: 'username', label: 'Client ID', placeholder: 'From Jira → Apps → Xray → API Keys' },
      { key: 'api_key', label: 'Client Secret', mask: true },
      { key: 'project_key', label: 'Jira Project Key', placeholder: 'e.g. QA' },
    ],
    steps: [
      'In Jira, go to Apps → Xray → "API Keys" (this lives under Xray\'s own settings, not Atlassian account settings).',
      'Click "Create API Key" to generate a Client ID and Client Secret pair.',
      'Copy both values immediately — the Client Secret is shown only once.',
      'Use the Client ID as "Client ID" and the Client Secret as the masked token field — these are exchanged for a temporary access token automatically, you never need to do that step yourself.',
    ],
  },
  {
    id: 'zephyr',
    label: 'Zephyr Scale',
    color: '#00B8D9',
    // Zephyr Scale Cloud has its own fixed API host (api.zephyrscale.smartbear.com) -
    // it does not live under your Jira domain, and only needs one bearer token.
    description: 'Manage test cases via Zephyr Scale Cloud (fixed API host, not your Jira URL).',
    scopes: ['Read and write test cases'],
    fields: [
      { key: 'api_key', label: 'API Access Token', mask: true, placeholder: 'Jira profile → Zephyr Scale → API Access Tokens' },
      { key: 'project_key', label: 'Jira Project Key', placeholder: 'e.g. QA' },
    ],
    steps: [
      'In Jira, click your avatar (top right) → "Zephyr Scale API Access Tokens" (this is separate from your normal Atlassian API token).',
      'Click "Create new token", label it, and confirm.',
      'Copy the token immediately — it will not be shown again.',
      'There is no separate base URL needed — Zephyr Scale Cloud always uses the same fixed API address behind the scenes.',
    ],
  },
  {
    id: 'aws',
    label: 'AWS CodeCommit',
    color: '#FF9900',
    description: 'Read, create, update, and delete files in an AWS CodeCommit repository.',
    scopes: ['Read and write repository files'],
    fields: [
      { key: 'username', label: 'AWS Access Key ID', placeholder: 'AKIA...' },
      { key: 'api_key', label: 'AWS Secret Access Key', mask: true },
      { key: 'region', label: 'AWS Region', placeholder: 'e.g. us-east-1' },
      { key: 'repo', label: 'Repository Name', placeholder: 'e.g. qa-automation-scripts' },
    ],
    steps: [
      'Sign in to the AWS Console and go to IAM → Users → (your user) → "Security credentials" tab.',
      'Click "Create access key", choose "Application running outside AWS" as the use case, and confirm.',
      'Copy both the Access Key ID and the Secret Access Key immediately — the secret is shown only once.',
      'Make sure this IAM user has the "AWSCodeCommitPowerUser" permission policy attached, or CodeCommit calls will fail with an access-denied error.',
      'Find your Region in the top-right of the AWS Console (e.g. "us-east-1"), and your Repository Name under the CodeCommit service.',
    ],
  },
]

export function getMcpTool(id) {
  return MCP_TOOLS.find((t) => t.id === id)
}
