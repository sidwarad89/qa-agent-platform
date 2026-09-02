import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('qa_agent_token')
    const username = localStorage.getItem('qa_agent_username')
    if (token && username) setUser({ username })
    setLoading(false)
  }, [])

  const loginUser = (username, token) => {
    localStorage.setItem('qa_agent_token', token)
    localStorage.setItem('qa_agent_username', username)
    setUser({ username })
  }

  const logoutUser = () => {
    localStorage.removeItem('qa_agent_token')
    localStorage.removeItem('qa_agent_username')
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
