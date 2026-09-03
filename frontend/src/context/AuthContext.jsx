import React, { createContext, useContext, useEffect, useState } from 'react'
import { fetchCurrentUser, logout as apiLogout } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionMessage, setSessionMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('qa_agent_token')
    const username = localStorage.getItem('qa_agent_username')
    const isAdmin = localStorage.getItem('qa_agent_is_admin') === 'true'
    if (token && username) {
      setUser({ username, isAdmin, avatarUrl: null })
      fetchCurrentUser().then((me) => {
        setUser((u) => (u ? { ...u, avatarUrl: me.avatar_data || null, email: me.email } : u))
      }).catch(() => {})
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      setSessionMessage(e.detail || 'You were signed out.')
      clearLocalSession()
      setUser(null)
    }
    window.addEventListener('qa-agent-session-invalidated', handler)
    return () => window.removeEventListener('qa-agent-session-invalidated', handler)
  }, [])

  const clearLocalSession = () => {
    localStorage.removeItem('qa_agent_token')
    localStorage.removeItem('qa_agent_username')
    localStorage.removeItem('qa_agent_is_admin')
  }

  const loginUser = (username, token, isAdmin = false) => {
    localStorage.setItem('qa_agent_token', token)
    localStorage.setItem('qa_agent_username', username)
    localStorage.setItem('qa_agent_is_admin', isAdmin ? 'true' : 'false')
    setSessionMessage('')
    setUser({ username, isAdmin, avatarUrl: null })
  }

  const logoutUser = () => {
    apiLogout() // best-effort - invalidates the token server-side too, not just locally
    clearLocalSession()
    setUser(null)
  }

  const updateAvatar = (avatarUrl) => {
    setUser((u) => (u ? { ...u, avatarUrl } : u))
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, updateAvatar, sessionMessage, clearSessionMessage: () => setSessionMessage('') }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
