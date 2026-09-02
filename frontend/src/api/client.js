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
export function buildAgent(config, onEvent, onDone, onError) {
  fetch(`${BASE_URL}/api/agent/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
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
  }).catch((err) => onError?.(err))
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

export async function fetchCurrentUser() {
  const { data } = await api.get('/api/auth/me')
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

export async function submitFeedback(message) {
  const { data } = await api.post('/api/profile/feedback', { message })
  return data
}

export async function fetchFeedback() {
  const { data } = await api.get('/api/profile/feedback')
  return data
}

// ---- MCP tools --------------------------------------------------------------

export async function executeMcpAction(payload) {
  const { data } = await api.post('/api/mcp/execute', payload)
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

export async function runAgenticStep(processId, payload) {
  const { data } = await api.post(`/api/agentic/process/${processId}/steps/run`, payload)
  return data
}

export async function approveAgenticStep(processId, stepIndex) {
  const { data } = await api.post(`/api/agentic/process/${processId}/steps/${stepIndex}/approve`)
  return data
}
