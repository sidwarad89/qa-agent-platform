import React, { useEffect, useState } from 'react'
import { FiTool, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck } from 'react-icons/fi'
import { fetchMyAgents, updateAgent, deleteAgent } from '../api/client'
import { AgentIllustration } from '../components/illustrations/Illustrations'
import { AI_MODELS, getProvider } from '../data/aiModels'
import { FRAMEWORKS } from '../data/frameworks'

export default function AgentsPage({ onNavigate }) {
  const [agents, setAgents] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const load = () => {
    fetchMyAgents().then((a) => { setAgents(a); setLoaded(true) }).catch(() => setLoaded(true))
  }
  useEffect(() => { load() }, [])

  const startEdit = (agent) => {
    setEditingId(agent.id)
    setEditValues({
      name: agent.name,
      ai_provider: agent.ai_provider || '',
      ai_model_version: agent.ai_model_version || '',
      framework: agent.framework || '',
      workflow_prompt: agent.workflow_prompt || '',
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditValues({}) }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      await updateAgent(id, editValues)
      cancelEdit()
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    await deleteAgent(id)
    setConfirmDeleteId(null)
    load()
  }

  const editProviderDef = getProvider(editValues.ai_provider)

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agents</h1>
          <p className="text-slate-500 text-sm mt-1">Every agent you've built, in one place. Edit or delete anytime.</p>
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
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <FiTool />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{a.name}</p>
                <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => startEdit(a)} title="Edit" className="text-slate-400 hover:text-indigo-600 shrink-0"><FiEdit2 size={15} /></button>
              <button onClick={() => setConfirmDeleteId(a.id)} title="Delete" className="text-slate-400 hover:text-red-500 shrink-0"><FiTrash2 size={15} /></button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {a.ai_provider && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{a.ai_provider}</span>}
              {a.framework && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{a.framework}</span>}
            </div>

            {confirmDeleteId === a.id && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col gap-2">
                <p className="text-xs text-red-700">Delete "{a.name}" permanently? This can't be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDeleteId(null)} className="flex-1 text-xs border border-slate-300 rounded-lg py-1.5 text-slate-600">Cancel</button>
                  <button onClick={() => handleDelete(a.id)} className="flex-1 text-xs bg-red-600 text-white rounded-lg py-1.5 font-medium">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editingId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-indigo-600 text-white p-5 flex items-center justify-between shrink-0">
              <p className="font-semibold">Edit Agent</p>
              <button onClick={cancelEdit}><FiX /></button>
            </div>
            <div className="p-5 overflow-y-auto flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Name</label>
                <input
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={editValues.name}
                  onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">AI Provider</label>
                  <select
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={editValues.ai_provider}
                    onChange={(e) => setEditValues((v) => ({ ...v, ai_provider: e.target.value, ai_model_version: '' }))}
                  >
                    <option value="">None</option>
                    {AI_MODELS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Model Version</label>
                  <select
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={editValues.ai_model_version}
                    onChange={(e) => setEditValues((v) => ({ ...v, ai_model_version: e.target.value }))}
                    disabled={!editProviderDef}
                  >
                    <option value="">None</option>
                    {editProviderDef?.versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Framework (optional)</label>
                <select
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={editValues.framework}
                  onChange={(e) => setEditValues((v) => ({ ...v, framework: e.target.value }))}
                >
                  <option value="">None</option>
                  {FRAMEWORKS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Workflow Prompt</label>
                <textarea
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm h-32"
                  value={editValues.workflow_prompt}
                  onChange={(e) => setEditValues((v) => ({ ...v, workflow_prompt: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button onClick={cancelEdit} className="flex-1 border border-slate-300 rounded-lg py-2 text-sm font-medium text-slate-600">
                  Cancel
                </button>
                <button
                  onClick={() => saveEdit(editingId)}
                  disabled={saving || !editValues.name?.trim()}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <FiCheck /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
