import React from 'react'

const LABELS = {
  myspace: 'My Space',
  build: 'Build',
  agents: 'Agents',
  mcp: 'MCP Tools',
  agentic: 'Agentic Process',
  profile: 'Profile',
  manage: 'Manage',
  analytics: 'Analytics',
}

export default function TopBar({ active }) {
  return (
    <header className="h-14 shrink-0 border-b border-slate-200 bg-white flex items-center px-6 gap-2 text-sm">
      <span className="text-slate-400 font-medium">Console</span>
      <span className="text-slate-300">/</span>
      <span className="text-slate-700 font-semibold">{LABELS[active] || active}</span>
    </header>
  )
}
