import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('qa_agent_token')
    const username = localStorage.getItem('qa_agent_username')
    const isAdmin = localStorage.getItem('qa_agent_is_admin') === 'true'
    if (token && username) setUser({ username, isAdmin })
    setLoading(false)
  }, [])

  const loginUser = (username, token, isAdmin = false) => {
    localStorage.setItem('qa_agent_token', token)
    localStorage.setItem('qa_agent_username', username)
    localStorage.setItem('qa_agent_is_admin', isAdmin ? 'true' : 'false')
    setUser({ username, isAdmin })
  }

  const logoutUser = () => {
    localStorage.removeItem('qa_agent_token')
    localStorage.removeItem('qa_agent_username')
    localStorage.removeItem('qa_agent_is_admin')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
