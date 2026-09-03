import React, { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { FiInfo } from 'react-icons/fi'
import { fetchUsageAnalytics } from '../api/client'

function formatDateLabel(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUsageAnalytics()
      .then((res) => setDays(res.days.map((d) => ({ ...d, label: formatDateLabel(d.date) }))))
      .catch(() => setError('Could not load analytics right now.'))
  }, [])

  const totalAgents = days?.reduce((sum, d) => sum + d.agents_created, 0) || 0
  const totalProcesses = days?.reduce((sum, d) => sum + d.processes_created, 0) || 0

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Your activity on this platform over the last 14 days.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{totalAgents}</p>
          <p className="text-xs text-slate-500">Agents created (14d)</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-teal-600">{totalProcesses}</p>
          <p className="text-xs text-slate-500">Agentic Processes created (14d)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-1.5 mb-4">
          <h2 className="font-semibold text-slate-700">Agent & Process Creation Trend</h2>
          <FiInfo className="text-slate-300" size={14} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {days && (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={days} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="agentsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="processesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === 'agents_created' ? 'Agents Created' : 'Processes Created')} />
                <Area type="monotone" dataKey="agents_created" stroke="#3b82f6" fill="url(#agentsFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="processes_created" stroke="#14b8a6" fill="url(#processesFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {days && totalAgents === 0 && totalProcesses === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No activity yet in the last 14 days — build an agent to see it show up here.</p>
        )}
      </div>
    </div>
  )
}
