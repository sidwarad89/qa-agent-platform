// Central catalog of AI engines/providers, their model versions, and
// plain-English steps for obtaining an API key for each. Add a new
// provider here and it automatically shows up in the UI, dropdown,
// and "How do I get this?" helper.

export const PROVIDERS = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    color: '#d97757',
    versions: [
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-fable-5',
      'claude-haiku-4-5-20251001',
    ],
    keyFormatHint: 'Starts with sk-ant-...',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    steps: [
      'Go to console.anthropic.com and sign in (or create a free account).',
      'Open the left sidebar and click "Settings" → "API Keys".',
      'Click "Create Key", give it a name (e.g. "QA-Agent"), and confirm.',
      'Copy the key immediately — it starts with sk-ant- and is only shown once.',
      'Paste it into the API Token field below. Add billing under "Plans & Billing" if this is a new account.',
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI (GPT)',
    color: '#10a37f',
    versions: ['gpt-5', 'gpt-4.1', 'gpt-4o', 'o3'],
    keyFormatHint: 'Starts with sk-...',
    consoleUrl: 'https://platform.openai.com/api-keys',
    steps: [
      'Go to platform.openai.com and sign in (separate from a normal ChatGPT login).',
      'Click your profile icon → "View API keys", or open platform.openai.com/api-keys directly.',
      'Click "Create new secret key", name it, and choose a project if prompted.',
      'Copy the key right away — OpenAI will not show it again.',
      'Under "Billing", add a payment method / credits so the key can make live calls.',
    ],
  },
  {
    id: 'gemini',
    label: 'Google (Gemini)',
    color: '#4285f4',
    versions: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    keyFormatHint: 'Starts with AIza...',
    consoleUrl: 'https://aistudio.google.com/app/apikey',
    steps: [
      'Go to aistudio.google.com and sign in with a Google account.',
      'Click "Get API key" in the left menu, then "Create API key".',
      'Choose an existing Google Cloud project or let Studio create one for you.',
      'Copy the generated key (starts with AIza...).',
      'Paste it below. Free tier has rate limits — attach a billing account for higher limits.',
    ],
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    color: '#f7813f',
    versions: ['mistral-large-2', 'mistral-medium', 'codestral'],
    keyFormatHint: 'Plain alphanumeric string',
    consoleUrl: 'https://console.mistral.ai/api-keys',
    steps: [
      'Go to console.mistral.ai and sign in or create an account.',
      'Open "API Keys" from the left navigation.',
      'Click "Create new key", label it, and set an optional expiry.',
      'Copy the key shown — it will not be displayed again.',
      'Paste it below and add a billing plan if you plan to exceed the free quota.',
    ],
  },
  {
    id: 'xai',
    label: 'xAI (Grok)',
    color: '#000000',
    versions: ['grok-4', 'grok-3-mini'],
    keyFormatHint: 'Starts with xai-...',
    consoleUrl: 'https://console.x.ai',
    steps: [
      'Go to console.x.ai and sign in with your X / xAI account.',
      'Navigate to "API Keys" in the console sidebar.',
      'Click "Create API Key", name it, and confirm.',
      'Copy the key (starts with xai-).',
      'Paste it below. Add credits under "Billing" if the account is new.',
    ],
  },
]

export function getProvider(id) {
  return PROVIDERS.find((p) => p.id === id)
}
