import React, { useEffect, useState } from 'react'
import { AgentConfigProvider } from './context/AgentConfigContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { trackVisit } from './api/client'

import SignIn from './components/auth/SignIn'
import SignUp from './components/auth/SignUp'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import ChatBotWidget from './components/ChatBotWidget'

import MySpacePage from './pages/MySpacePage'
import BuildPage from './pages/BuildPage'
import AgentsPage from './pages/AgentsPage'
import McpPage from './pages/McpPage'
import AgenticProcessPage from './pages/AgenticProcessPage'
import ProfilePage from './pages/ProfilePage'
import ManagePage from './pages/ManagePage'

function Console() {
  const { user, logoutUser } = useAuth()
  const { theme } = useTheme()
  const [active, setActive] = useState('myspace')
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => { trackVisit('/console') }, [])

  const renderPage = () => {
    switch (active) {
      case 'build': return <BuildPage onNavigate={setActive} />
      case 'agents': return <AgentsPage onNavigate={setActive} />
      case 'mcp': return <McpPage />
      case 'agentic': return <AgenticProcessPage />
      case 'profile': return <ProfilePage />
      case 'manage': return user?.isAdmin ? <ManagePage /> : <MySpacePage onNavigate={setActive} />
      default: return <MySpacePage onNavigate={setActive} />
    }
  }

  return (
    <div className={`h-screen flex ${theme.className}`}>
      <Sidebar
        active={active}
        onNavigate={setActive}
        username={user?.username}
        isAdmin={user?.isAdmin}
        onLogout={logoutUser}
        onToggleChat={() => setChatOpen((c) => !c)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar active={active} />
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
      <ChatBotWidget open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()
  const [mode, setMode] = useState('signin')

  if (loading) return null

  if (!user) {
    return mode === 'signin'
      ? <SignIn onSwitchToSignUp={() => setMode('signup')} />
      : <SignUp onSwitchToSignIn={() => setMode('signin')} />
  }

  return (
    <AgentConfigProvider>
      <Console />
    </AgentConfigProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthGate />
      </ThemeProvider>
    </AuthProvider>
  )
}
