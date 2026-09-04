import React, { createContext, useContext, useEffect, useState } from 'react'
import { scopedKey } from '../utils/scopedStorage'

const AiConnectionsContext = createContext(null)

function loadConnections() {
  try {
    const saved = localStorage.getItem(scopedKey('qa_ai_connections'))
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export function AiConnectionsProvider({ children }) {
  // { [providerId]: { model_version, api_key } } - only ever written on a
  // successful validation, so "present" always means "known good".
  const [connections, setConnections] = useState(loadConnections)

  useEffect(() => {
    localStorage.setItem(scopedKey('qa_ai_connections'), JSON.stringify(connections))
  }, [connections])

  const setConnection = (providerId, data) => setConnections((c) => ({ ...c, [providerId]: data }))
  const removeConnection = (providerId) => setConnections((c) => {
    const next = { ...c }
    delete next[providerId]
    return next
  })

  return (
    <AiConnectionsContext.Provider value={{ connections, setConnection, removeConnection }}>
      {children}
    </AiConnectionsContext.Provider>
  )
}

export function useAiConnections() {
  const ctx = useContext(AiConnectionsContext)
  if (!ctx) throw new Error('useAiConnections must be used within AiConnectionsProvider')
  return ctx
}
