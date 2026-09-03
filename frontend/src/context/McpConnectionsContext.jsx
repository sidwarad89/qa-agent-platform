import React, { createContext, useContext, useEffect, useState } from 'react'
import { scopedKey } from '../utils/scopedStorage'

const McpConnectionsContext = createContext(null)

function loadConnections() {
  try {
    const saved = localStorage.getItem(scopedKey('qa_mcp_connections'))
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export function McpConnectionsProvider({ children }) {
  const [connections, setConnections] = useState(loadConnections)

  useEffect(() => {
    localStorage.setItem(scopedKey('qa_mcp_connections'), JSON.stringify(connections))
  }, [connections])

  const setConnection = (toolId, credentials) => setConnections((c) => ({ ...c, [toolId]: credentials }))
  const removeConnection = (toolId) => setConnections((c) => {
    const next = { ...c }
    delete next[toolId]
    return next
  })

  return (
    <McpConnectionsContext.Provider value={{ connections, setConnection, removeConnection }}>
      {children}
    </McpConnectionsContext.Provider>
  )
}

export function useMcpConnections() {
  const ctx = useContext(McpConnectionsContext)
  if (!ctx) throw new Error('useMcpConnections must be used within McpConnectionsProvider')
  return ctx
}
