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
  },
]

export function getMcpTool(id) {
  return MCP_TOOLS.find((t) => t.id === id)
}
