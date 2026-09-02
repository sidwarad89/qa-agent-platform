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
    description: 'Manage test entities inside Jira via Xray.',
    scopes: ['Read and write tests', 'Access test execution data'],
    fields: [
      { key: 'base_url', label: 'Xray/Jira Base URL', placeholder: 'https://yourorg.atlassian.net' },
      { key: 'username', label: 'Client ID', placeholder: '' },
      { key: 'api_key', label: 'Client Secret', mask: true },
    ],
  },
  {
    id: 'zephyr',
    label: 'Zephyr Scale',
    color: '#00B8D9',
    description: 'Manage test cases inside Jira via Zephyr Scale.',
    scopes: ['Read and write test cases'],
    fields: [
      { key: 'base_url', label: 'Zephyr/Jira Base URL', placeholder: 'https://yourorg.atlassian.net' },
      { key: 'api_key', label: 'API Access Token', mask: true },
    ],
  },
]

export function getMcpTool(id) {
  return MCP_TOOLS.find((t) => t.id === id)
}
