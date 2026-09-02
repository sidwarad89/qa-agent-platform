import React, { useEffect, useState } from 'react'
import { FiUsers, FiEye, FiUserPlus, FiTrendingUp, FiClock } from 'react-icons/fi'
import { fetchAdminUsers, fetchAdminStats, fetchAdminTimeline, fetchRecentLogins } from '../api/client'

export default function ManagePage() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [recentLogins, setRecentLogins] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAdminStats().then(setStats).catch((e) => setError(e?.response?.data?.detail || 'Could not load stats.'))
    fetchAdminUsers().then(setUsers).catch(() => {})
    fetchAdminTimeline().then(setTimeline).catch(() => {})
    fetchRecentLogins().then(setRecentLogins).catch(() => {})
  }, [])

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-6">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Manage</h1>
        <p className="text-slate-500 text-sm mt-1">Who's using the platform, and how much. Admin access is restricted to you alone.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard icon={FiUsers} label="Total Users" value={stats.total_users} color="#6366f1" />
          <StatCard icon={FiEye} label="Total Visits" value={stats.total_visits} color="#0ea5e9" />
          <StatCard icon={FiTrendingUp} label="Visits Today" value={stats.visits_today} color="#10b981" />
          <StatCard icon={FiUserPlus} label="Signups Today" value={stats.signups_today} color="#f59e0b" />
          <StatCard icon={FiUserPlus} label="New This Week" value={stats.new_users_7d} color="#ec4899" />
        </div>
      )}

      {timeline && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 text-sm mb-3">New Members Over Time</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            {timeline.buckets.map((b) => (
              <div key={b.label} className="flex-1 min-w-[100px] bg-slate-50 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-slate-800">{b.count}</p>
                <p className="text-[11px] text-slate-500">{b.label}</p>
              </div>
            ))}
          </div>
          <h3 className="text-xs font-semibold text-slate-500 mb-2">Signups by Year (last 5 years)</h3>
          <div className="flex gap-2">
            {timeline.yearly.map((y) => (
              <div key={y.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-indigo-100 rounded-t-md flex items-end justify-center" style={{ height: `${20 + y.count * 6}px` }}>
                  <span className="text-[11px] font-semibold text-indigo-700 pb-1">{y.count}</span>
                </div>
                <span className="text-[11px] text-slate-400">{y.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentLogins.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2"><FiClock /> Who's Logged In (most recent first)</h2>
          <div className="flex flex-wrap gap-2">
            {recentLogins.map((r) => (
              <span key={r.username} className="text-xs px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                <strong className="text-slate-800">{r.username}</strong> — {r.last_login ? new Date(r.last_login).toLocaleString() : 'never'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-700 text-sm">All Users</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Email</th>
                <th className="px-5 py-2 font-medium">Joined</th>
                <th className="px-5 py-2 font-medium">Last Login</th>
                <th className="px-5 py-2 font-medium">Agents</th>
                <th className="px-5 py-2 font-medium">Processes</th>
                <th className="px-5 py-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-700">{u.username}</td>
                  <td className="px-5 py-3 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-slate-500">{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{u.agents_count}</td>
                  <td className="px-5 py-3 text-slate-500">{u.processes_count}</td>
                  <td className="px-5 py-3">
                    {u.is_admin ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">Admin</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">User</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-6 text-center text-slate-400">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-1">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: color }}>
        <Icon size={14} />
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
