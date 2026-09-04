import axios from 'axios'

// In production, set VITE_API_BASE_URL in your hosting provider's
// environment variables to your deployed backend's URL (e.g.
// https://your-backend.onrender.com). Falls back to localhost for local dev.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: BASE_URL })

// Attach the logged-in user's token to every request automatically.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qa_agent_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// If any authenticated call comes back 401, the session is no longer valid -
// most commonly because this account just logged in somewhere else. Force a
// clean logout everywhere except the login/signup screens themselves (those
// return 401 for plain "wrong password", which isn't a session issue).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthEndpoint = err.config?.url?.includes('/api/auth/login') || err.config?.url?.includes('/api/auth/signup')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      const message = err.response?.data?.detail || 'You were signed out.'
      window.dispatchEvent(new CustomEvent('qa-agent-session-invalidated', { detail: message }))
    }
    return Promise.reject(err)
  }
)

// ---- AI model validation -------------------------------------------------

export async function validateModelToken(payload) {
  const { data } = await api.post('/api/models/validate', payload)
  return data
}

export async function validateInputTool(payload) {
  const { data } = await api.post('/api/input-tools/validate', payload)
  return data
}

export async function validateOutputTool(payload) {
  const { data } = await api.post('/api/output-tools/validate', payload)
  return data
}

/** Streams agent run progress via SSE, invoking onEvent for each step result. */
export function buildAgent(config, onEvent, onDone, onError, signal) {
  fetch(`${BASE_URL}/api/agent/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    signal,
  }).then(async (res) => {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()
      for (const part of parts) {
        if (part.startsWith('data: ')) {
          const json = JSON.parse(part.slice(6))
          onEvent(json)
          if (json.step_name === 'done') onDone?.()
        }
      }
    }
  }).catch((err) => {
    if (err.name === 'AbortError') return // intentionally paused, not a real failure
    onError?.(err)
  })
}

// ---- Auth -----------------------------------------------------------------

export async function signup(payload) {
  const { data } = await api.post('/api/auth/signup', payload)
  return data
}

export async function login(payload) {
  const { data } = await api.post('/api/auth/login', payload)
  return data
}

export async function logout() {
  try { await api.post('/api/auth/logout') } catch { /* best-effort */ }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/api/auth/me')
  return data
}

export async function updateProfilePicture(avatarDataUrl) {
  const { data } = await api.patch('/api/auth/profile', { avatar_data: avatarDataUrl })
  return data
}

export async function changePassword(payload) {
  const { data } = await api.post('/api/auth/change-password', payload)
  return data
}

// ---- Profile / stats / feedback -------------------------------------------

export async function fetchProfileStats() {
  const { data } = await api.get('/api/profile/stats')
  return data
}

export async function recordAgentBuilt(payload) {
  const { data } = await api.post('/api/profile/agents', payload)
  return data
}

export async function fetchMyAgents() {
  const { data } = await api.get('/api/profile/agents')
  return data
}

export async function updateAgent(agentId, payload) {
  const { data } = await api.patch(`/api/profile/agents/${agentId}`, payload)
  return data
}

export async function deleteAgent(agentId) {
  const { data } = await api.delete(`/api/profile/agents/${agentId}`)
  return data
}

export async function submitFeedback(message) {
  const { data } = await api.post('/api/profile/feedback', { message })
  return data
}

export async function fetchFeedback() {
  const { data } = await api.get('/api/profile/feedback')
  return data
}

export async function fetchUsageAnalytics() {
  const { data } = await api.get('/api/profile/analytics')
  return data
}

// ---- MCP tools --------------------------------------------------------------

export async function executeMcpAction(payload) {
  const { data } = await api.post('/api/mcp/execute', payload)
  return data
}

export async function validateMcpTool(payload) {
  const { data } = await api.post('/api/mcp/validate', payload)
  return data
}

export async function inferMcpMethod(instruction) {
  const { data } = await api.post(`/api/mcp/infer-method`, null, { params: { instruction } })
  return data
}

// ---- Agentic Process --------------------------------------------------------

export async function createAgenticProcess(name) {
  const { data } = await api.post('/api/agentic/process', { name })
  return data
}

export async function listAgenticProcesses() {
  const { data } = await api.get('/api/agentic/process')
  return data
}

export async function renameAgenticProcess(processId, name) {
  const { data } = await api.patch(`/api/agentic/process/${processId}`, { name })
  return data
}

export async function deleteAgenticProcess(processId) {
  const { data } = await api.delete(`/api/agentic/process/${processId}`)
  return data
}

export async function runAgenticStep(processId, payload) {
  const { data } = await api.post(`/api/agentic/process/${processId}/steps/run`, payload)
  return data
}

export async function approveAgenticStep(processId, stepIndex) {
  const { data } = await api.post(`/api/agentic/process/${processId}/steps/${stepIndex}/approve`)
  return data
}

export async function confirmAgenticProcess(processId) {
  const { data } = await api.post(`/api/agentic/process/${processId}/confirm`)
  return data
}

// ---- Admin / analytics -----------------------------------------------------

export async function fetchAdminUsers() {
  const { data } = await api.get('/api/admin/users')
  return data
}

export async function fetchAdminStats() {
  const { data } = await api.get('/api/admin/stats')
  return data
}

export async function trackVisit(path = '/') {
  try {
    await api.post('/api/track/visit', null, { params: { path } })
  } catch {
    // tracking failures should never disrupt the app
  }
}

export async function fetchAdminTimeline() {
  const { data } = await api.get('/api/admin/timeline')
  return data
}

export async function fetchRecentLogins() {
  const { data } = await api.get('/api/admin/recent-logins')
  return data
}

// ---- Chatbot ----------------------------------------------------------------

export async function sendChatbotMessage(payload) {
  const { data } = await api.post('/api/chatbot/message', payload)
  return data
}

export async function generateOnboardingPlan(payload) {
  const { data } = await api.post('/api/chatbot/plan', payload)
  return data
}
