import React, { useEffect, useState } from 'react'
import { FiTool, FiGrid, FiCheckCircle } from 'react-icons/fi'
import { fetchProfileStats } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function MySpacePage({ onNavigate }) {
  const { user } = useAuth()
  const [stats, setStats] = useState({ agents_count: 0, processes_count: 0, reviews_count: 0 })

  useEffect(() => {
    fetchProfileStats().then(setStats).catch(() => {})
  }, [])

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Welcome back, {user?.username || 'there'}.</h1>
        <p className="text-slate-500 mt-1">Here's a quick look at what you've built so far.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={FiTool} label="Agents Built" value={stats.agents_count} color="#6366f1" />
        <StatCard icon={FiGrid} label="Agentic Processes" value={stats.processes_count} color="#ec4899" />
        <StatCard icon={FiCheckCircle} label="Reviews" value={stats.reviews_count} color="#10b981" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate('build')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-slate-800 mb-1">Build a new Agent</h3>
          <p className="text-sm text-slate-500">Pick an AI engine, language, and framework, then generate it.</p>
        </button>
        <button
          onClick={() => onNavigate('agentic')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-slate-800 mb-1">Start an Agentic Process</h3>
          <p className="text-sm text-slate-500">Chain multiple agents together with human-in-the-loop review.</p>
        </button>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}
