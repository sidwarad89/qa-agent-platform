import axios from 'axios'

// In production, set VITE_API_BASE_URL in your hosting provider's
// environment variables to your deployed backend's URL (e.g.
// https://your-backend.onrender.com). Falls back to localhost for local dev.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: BASE_URL })

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
