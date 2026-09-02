import React, { useEffect, useState } from 'react'
import { FiTool, FiPlus } from 'react-icons/fi'
import { fetchMyAgents } from '../api/client'
import { AgentIllustration } from '../components/illustrations/Illustrations'

export default function AgentsPage({ onNavigate }) {
  const [agents, setAgents] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchMyAgents().then((a) => { setAgents(a); setLoaded(true) }).catch(() => setLoaded(true))
  }, [])

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agents</h1>
          <p className="text-slate-500 text-sm mt-1">Every agent you've built, in one place.</p>
        </div>
        <button
          onClick={() => onNavigate('build')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
        >
          <FiPlus /> New Agent
        </button>
      </div>

      {loaded && agents.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center gap-3 text-center">
          <AgentIllustration className="w-40 h-24" />
          <p className="text-slate-500 text-sm">You haven't built any agents yet.</p>
          <button onClick={() => onNavigate('build')} className="text-indigo-600 text-sm font-medium">Build your first one →</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {agents.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <FiTool />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{a.name}</p>
                <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {a.ai_provider && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{a.ai_provider}</span>}
              {a.framework && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{a.framework}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
