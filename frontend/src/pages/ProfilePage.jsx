import React, { useEffect, useRef, useState } from 'react'
import { FiTool, FiGrid, FiCheckCircle, FiMessageSquare, FiCamera, FiLock } from 'react-icons/fi'
import {
  fetchProfileStats, fetchMyAgents, submitFeedback, fetchFeedback,
  updateProfilePicture, changePassword,
} from '../api/client'
import { useAuth } from '../context/AuthContext'

function resizeImageFile(file, maxSize = 200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > height) { height = (height / width) * maxSize; width = maxSize }
        else { width = (width / height) * maxSize; height = maxSize }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ProfilePage() {
  const { user, updateAvatar } = useAuth()
  const [stats, setStats] = useState({ agents_count: 0, processes_count: 0, reviews_count: 0 })
  const [agents, setAgents] = useState([])
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackList, setFeedbackList] = useState([])
  const [feedbackStatus, setFeedbackStatus] = useState('idle')

  const fileInputRef = useRef(null)
  const [avatarStatus, setAvatarStatus] = useState('idle')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState('idle')
  const [passwordMessage, setPasswordMessage] = useState('')

  const loadAll = () => {
    fetchProfileStats().then(setStats).catch(() => {})
    fetchMyAgents().then(setAgents).catch(() => {})
    fetchFeedback().then(setFeedbackList).catch(() => {})
  }

  useEffect(() => { loadAll() }, [])

  const handleFeedback = async (e) => {
    e.preventDefault()
    if (!feedbackText.trim()) return
    setFeedbackStatus('sending')
    try {
      await submitFeedback(feedbackText)
      setFeedbackText('')
      setFeedbackStatus('sent')
      loadAll()
    } catch {
      setFeedbackStatus('error')
    }
  }

  const handleAvatarChange = async (file) => {
    if (!file) return
    setAvatarStatus('uploading')
    try {
      const dataUrl = await resizeImageFile(file)
      await updateProfilePicture(dataUrl)
      updateAvatar(dataUrl)
      setAvatarStatus('done')
    } catch {
      setAvatarStatus('error')
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordMessage('')
    if (newPassword !== confirmPassword) {
      setPasswordStatus('error')
      setPasswordMessage("New passwords don't match.")
      return
    }
    setPasswordStatus('saving')
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      setPasswordStatus('done')
      setPasswordMessage('Password updated.')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err) {
      setPasswordStatus('error')
      setPasswordMessage(err?.response?.data?.detail || 'Could not update password.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center text-2xl font-bold">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
            title="Change profile picture"
          >
            <FiCamera size={12} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarChange(e.target.files?.[0])} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{user?.username}</h1>
          <p className="text-slate-500 text-sm">{user?.isAdmin ? 'Admin' : 'User'}{avatarStatus === 'uploading' && ' · Uploading picture...'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatPill icon={FiTool} label="Agents" value={stats.agents_count} color="#6366f1" />
        <StatPill icon={FiGrid} label="Processes" value={stats.processes_count} color="#ec4899" />
        <StatPill icon={FiCheckCircle} label="Reviews" value={stats.reviews_count} color="#10b981" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><FiLock /> Change Password</h2>
        <form onSubmit={handlePasswordChange} className="flex flex-col gap-3 max-w-sm">
          <input type="password" placeholder="Current password" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          <input type="password" placeholder="New password" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          <input type="password" placeholder="Confirm new password" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          {passwordMessage && (
            <p className={`text-sm ${passwordStatus === 'done' ? 'text-emerald-600' : 'text-red-600'}`}>{passwordMessage}</p>
          )}
          <button type="submit" disabled={passwordStatus === 'saving'} className="self-start px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {passwordStatus === 'saving' ? 'Updating...' : 'Update Password'}
          </button>
        </form>
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
          <button type="submit" disabled={feedbackStatus === 'sending'} className="self-start px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {feedbackStatus === 'sending' ? 'Sending...' : 'Submit Feedback'}
          </button>
          {feedbackStatus === 'sent' && <p className="text-sm text-emerald-600">Thanks for your feedback!</p>}
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
