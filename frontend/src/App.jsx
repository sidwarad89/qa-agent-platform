import React from 'react'
import { AgentConfigProvider } from './context/AgentConfigContext'
import Dashboard from './components/Dashboard'

export default function App() {
  return (
    <AgentConfigProvider>
      <div className="min-h-screen bg-slate-50">
        <Dashboard />
      </div>
    </AgentConfigProvider>
  )
}
