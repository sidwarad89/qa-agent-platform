import React, { useState } from 'react'
import { login } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function SignIn({ onSwitchToSignUp }) {
  const { loginUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login({ username, password })
      loginUser(data.username, data.access_token)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not sign in. Check your username and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col gap-4">
        <div className="text-center mb-1">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg">Q</div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to QA Agent Builder</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Username</label>
          <input className="border border-slate-300 rounded-lg px-3 py-2.5" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Password</label>
          <input type="password" className="border border-slate-300 rounded-lg px-3 py-2.5" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white rounded-lg py-2.5 font-semibold disabled:opacity-50 mt-1">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="text-sm text-slate-500 text-center">
          Don't have an account?{' '}
          <button type="button" onClick={onSwitchToSignUp} className="text-indigo-600 font-medium">Sign up</button>
        </p>
      </form>
    </div>
  )
}
