import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AgentConfigProvider } from './context/AgentConfigContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { trackVisit } from './api/client'

import SignIn from './components/auth/SignIn'
import SignUp from './components/auth/SignUp'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import ChatBotWidget from './components/ChatBotWidget'
import AssistantToggle from './components/AssistantToggle'
import OnboardingGuide from './components/OnboardingGuide'
import ErrorBoundary from './components/ErrorBoundary'

import MySpacePage from './pages/MySpacePage'
import BuildPage from './pages/BuildPage'
import AgentsPage from './pages/AgentsPage'
import McpPage from './pages/McpPage'
import AgenticProcessPage from './pages/AgenticProcessPage'
import ProfilePage from './pages/ProfilePage'
import ManagePage from './pages/ManagePage'
import AnalyticsPage from './pages/AnalyticsPage'

function Console() {
  const { user, logoutUser } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const active = location.pathname === '/' ? 'myspace' : location.pathname.replace('/', '')

  const [chatOpen, setChatOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(() => !sessionStorage.getItem('qa_onboarding_shown'))

  useEffect(() => { trackVisit('/console') }, [])

  const goTo = (id) => navigate(id === 'myspace' ? '/' : `/${id}`)

  const closeOnboarding = () => {
    sessionStorage.setItem('qa_onboarding_shown', 'true')
    setOnboardingOpen(false)
  }

  return (
    <div className={`h-screen flex ${theme.className}`}>
      <Sidebar
        active={active}
        onNavigate={goTo}
        username={user?.username}
        avatarUrl={user?.avatarUrl}
        isAdmin={user?.isAdmin}
        onLogout={logoutUser}
        onToggleChat={() => setChatOpen((c) => !c)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar active={active} />
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary key={location.pathname}>
            <Routes>
              <Route path="/" element={<MySpacePage onNavigate={goTo} onOpenGuide={() => setOnboardingOpen(true)} />} />
              <Route path="/build" element={<BuildPage onNavigate={goTo} />} />
              <Route path="/agents" element={<AgentsPage onNavigate={goTo} />} />
              <Route path="/mcp" element={<McpPage />} />
              <Route path="/agentic" element={<AgenticProcessPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/manage" element={user?.isAdmin ? <ManagePage /> : <Navigate to="/" replace />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
      <AssistantToggle onClick={() => setChatOpen((c) => !c)} />
      <ChatBotWidget open={chatOpen} onClose={() => setChatOpen(false)} />
      <OnboardingGuide open={onboardingOpen} onClose={closeOnboarding} />
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
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AuthGate />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
