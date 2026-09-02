import React, { useEffect, useState } from 'react'
import { FiTool, FiGrid, FiCheckCircle, FiMessageSquare } from 'react-icons/fi'
import { fetchProfileStats, fetchMyAgents, submitFeedback, fetchFeedback } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ agents_count: 0, processes_count: 0, reviews_count: 0 })
  const [agents, setAgents] = useState([])
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackList, setFeedbackList] = useState([])
  const [status, setStatus] = useState('idle')

  const loadAll = () => {
    fetchProfileStats().then(setStats).catch(() => {})
    fetchMyAgents().then(setAgents).catch(() => {})
    fetchFeedback().then(setFeedbackList).catch(() => {})
  }

  useEffect(() => { loadAll() }, [])

  const handleFeedback = async (e) => {
    e.preventDefault()
    if (!feedbackText.trim()) return
    setStatus('sending')
    try {
      await submitFeedback(feedbackText)
      setFeedbackText('')
      setStatus('sent')
      loadAll()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center text-2xl font-bold">
          {user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{user?.username}</h1>
          <p className="text-slate-500 text-sm">User</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatPill icon={FiTool} label="Agents" value={stats.agents_count} color="#6366f1" />
        <StatPill icon={FiGrid} label="Processes" value={stats.processes_count} color="#ec4899" />
        <StatPill icon={FiCheckCircle} label="Reviews" value={stats.reviews_count} color="#10b981" />
      </div>

      <div>
        <h2 className="font-semibold text-slate-800 mb-3">Your Agents</h2>
        {agents.length === 0 ? (
          <p className="text-sm text-slate-400">You haven't built any agents yet — head to Build to create one.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {agents.map((a) => (
              <div key={a.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.ai_provider} · {a.framework}</p>
                </div>
                <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><FiMessageSquare /> Feedback</h2>
        <form onSubmit={handleFeedback} className="flex flex-col gap-2">
          <textarea
            className="border border-slate-300 rounded-lg px-3 py-2 w-full h-24"
            placeholder="Share your feedback about the platform..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <button type="submit" disabled={status === 'sending'} className="self-start px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {status === 'sending' ? 'Sending...' : 'Submit Feedback'}
          </button>
          {status === 'sent' && <p className="text-sm text-emerald-600">Thanks for your feedback!</p>}
        </form>

        {feedbackList.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 max-h-56 overflow-y-auto">
            {feedbackList.map((f) => (
              <div key={f.id} className="border border-slate-200 rounded-lg p-3">
                <p className="text-sm text-slate-700">{f.message}</p>
                <p className="text-xs text-slate-400 mt-1">— {f.username}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col items-center gap-1">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: color }}>
        <Icon size={16} />
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
