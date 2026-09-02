// Every provider's model versions, each annotated with:
//  - free: whether the provider offers a free tier / free credits for it
//  - bestFor: short tags shown beside the version so the user knows what
//    it's actually good at before they commit an API key to it.

export const AI_MODELS = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    color: '#d97757',
    keyFormatHint: 'Starts with sk-ant-...',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    steps: [
      'Go to console.anthropic.com and sign in (or create a free account).',
      'Open the left sidebar and click "Settings" → "API Keys".',
      'Click "Create Key", give it a name (e.g. "QA-Agent"), and confirm.',
      'Copy the key immediately — it starts with sk-ant- and is only shown once.',
      'Paste it into the API Token field below. Add billing under "Plans & Billing" if this is a new account.',
    ],
    versions: [
      { id: 'claude-opus-5', label: 'Claude Opus 5', free: false, bestFor: ['Deep reasoning', 'Complex coding', 'Long documents'] },
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', free: true, bestFor: ['Everyday coding', 'Balanced cost/speed', 'Agentic tasks'] },
      { id: 'claude-fable-5', label: 'Claude Fable 5', free: true, bestFor: ['Creative writing', 'Long-form content'] },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', free: true, bestFor: ['Fast responses', 'High-volume/cheap tasks'] },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI (GPT)',
    color: '#10a37f',
    keyFormatHint: 'Starts with sk-...',
    consoleUrl: 'https://platform.openai.com/api-keys',
    steps: [
      'Go to platform.openai.com and sign in (separate from a normal ChatGPT login).',
      'Click your profile icon → "View API keys", or open platform.openai.com/api-keys directly.',
      'Click "Create new secret key", name it, and choose a project if prompted.',
      'Copy the key right away — OpenAI will not show it again.',
      'New accounts get a small free credit; add a payment method under "Billing" once it runs out.',
    ],
    versions: [
      { id: 'gpt-5', label: 'GPT-5', free: false, bestFor: ['Complex reasoning', 'Advanced coding'] },
      { id: 'gpt-4.1', label: 'GPT-4.1', free: false, bestFor: ['General purpose', 'Long context'] },
      { id: 'gpt-4o', label: 'GPT-4o', free: true, bestFor: ['Multimodal (text+image)', 'Fast chat'] },
      { id: 'o3', label: 'o3', free: false, bestFor: ['Step-by-step reasoning', 'Math/logic'] },
    ],
  },
  {
    id: 'gemini',
    label: 'Google (Gemini)',
    color: '#4285f4',
    keyFormatHint: 'Starts with AIza...',
    consoleUrl: 'https://aistudio.google.com/app/apikey',
    steps: [
      'Go to aistudio.google.com and sign in with a Google account.',
      'Click "Get API key" in the left menu, then "Create API key".',
      'Choose an existing Google Cloud project or let Studio create one for you.',
      'Copy the generated key (starts with AIza...).',
      'Gemini has a genuinely free tier with rate limits — no card needed to start.',
    ],
    versions: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', free: true, bestFor: ['Reasoning', 'Large context (docs/codebases)'] },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', free: true, bestFor: ['Fast + cheap', 'High-volume tasks'] },
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', free: true, bestFor: ['General purpose', 'Free-tier friendly'] },
    ],
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    color: '#f7813f',
    keyFormatHint: 'Plain alphanumeric string',
    consoleUrl: 'https://console.mistral.ai/api-keys',
    steps: [
      'Go to console.mistral.ai and sign in or create an account.',
      'Open "API Keys" from the left navigation.',
      'Click "Create new key", label it, and set an optional expiry.',
      'Copy the key shown — it will not be displayed again.',
      'Mistral gives a free "experiment" tier with rate limits to start.',
    ],
    versions: [
      { id: 'mistral-large-2', label: 'Mistral Large 2', free: false, bestFor: ['Complex reasoning', 'Multilingual'] },
      { id: 'mistral-medium', label: 'Mistral Medium', free: true, bestFor: ['Balanced cost/quality'] },
      { id: 'codestral', label: 'Codestral', free: true, bestFor: ['Code generation', 'Code completion'] },
    ],
  },
  {
    id: 'xai',
    label: 'xAI (Grok)',
    color: '#000000',
    keyFormatHint: 'Starts with xai-...',
    consoleUrl: 'https://console.x.ai',
    steps: [
      'Go to console.x.ai and sign in with your X / xAI account.',
      'Navigate to "API Keys" in the console sidebar.',
      'Click "Create API Key", name it, and confirm.',
      'Copy the key (starts with xai-).',
      'New accounts often get free starter credits — check "Billing" in console.',
    ],
    versions: [
      { id: 'grok-4', label: 'Grok 4', free: false, bestFor: ['Reasoning', 'Real-time/current events'] },
      { id: 'grok-3-mini', label: 'Grok 3 Mini', free: true, bestFor: ['Fast + cheap', 'Simple tasks'] },
    ],
  },
  {
    id: 'groq',
    label: 'Groq (fast inference)',
    color: '#f55036',
    keyFormatHint: 'Starts with gsk_...',
    consoleUrl: 'https://console.groq.com/keys',
    steps: [
      'Go to console.groq.com and sign in.',
      'Click "API Keys" in the sidebar → "Create API Key".',
      'Copy the key (starts with gsk_).',
      'Groq\'s free tier is genuinely generous and needs no card — great for testing.',
    ],
    versions: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', free: true, bestFor: ['Fast responses', 'General purpose'] },
      { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B', free: true, bestFor: ['Reasoning', 'Free + fast'] },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    color: '#4d6bfe',
    keyFormatHint: 'Starts with sk-...',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    steps: [
      'Go to platform.deepseek.com and sign in.',
      'Open "API Keys" → "Create new API key".',
      'Copy the key immediately.',
      'DeepSeek is known for being very cheap even outside its free trial credit.',
    ],
    versions: [
      { id: 'deepseek-chat', label: 'DeepSeek-V3 (chat)', free: true, bestFor: ['General purpose', 'Very low cost'] },
      { id: 'deepseek-reasoner', label: 'DeepSeek-R1 (reasoner)', free: true, bestFor: ['Step-by-step reasoning', 'Coding'] },
    ],
  },
  {
    id: 'together',
    label: 'Together AI',
    color: '#0f6fff',
    keyFormatHint: 'Plain alphanumeric string',
    consoleUrl: 'https://api.together.ai/settings/api-keys',
    steps: [
      'Go to together.ai, sign up, and open the API Keys settings page.',
      'Click "Create API Key" and copy it.',
      'Together AI gives free starter credit and hosts many open-source free models permanently.',
    ],
    versions: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', label: 'Llama 3.3 70B (Free)', free: true, bestFor: ['General purpose', 'Always-free model'] },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B', free: false, bestFor: ['Coding', 'Multilingual'] },
    ],
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    color: '#20808d',
    keyFormatHint: 'Starts with pplx-...',
    consoleUrl: 'https://www.perplexity.ai/settings/api',
    steps: [
      'Go to perplexity.ai/settings/api and sign in.',
      'Click "Generate" under API keys.',
      'Copy the key (starts with pplx-).',
      'New accounts get a small free credit; primarily paid after that.',
    ],
    versions: [
      { id: 'sonar', label: 'Sonar', free: true, bestFor: ['Web-aware answers', 'Current events/research'] },
      { id: 'sonar-pro', label: 'Sonar Pro', free: false, bestFor: ['Deeper research', 'Longer answers'] },
    ],
  },
]

export function getProvider(id) {
  return AI_MODELS.find((p) => p.id === id)
}

export function getVersion(providerId, versionId) {
  const provider = getProvider(providerId)
  return provider?.versions.find((v) => v.id === versionId)
}
