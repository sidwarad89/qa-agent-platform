import React, { useState } from 'react'
import { FiShield, FiCheck, FiLoader, FiAlertCircle } from 'react-icons/fi'
import { MCP_TOOLS } from '../data/mcpTools'
import { validateMcpTool } from '../api/client'

export default function McpPage() {
  const [connecting, setConnecting] = useState(null) // tool id
  const [connected, setConnected] = useState({})     // { [toolId]: credentials }
  const [formValues, setFormValues] = useState({})
  const [status, setStatus] = useState('idle')       // idle | validating | error
  const [errorMessage, setErrorMessage] = useState('')

  const openConnect = (tool) => {
    setConnecting(tool.id)
    setFormValues({})
    setStatus('idle')
    setErrorMessage('')
  }

  const confirmConnect = async () => {
    setStatus('validating')
    setErrorMessage('')
    try {
      const result = await validateMcpTool({ tool: connecting, credentials: formValues })
      if (result.valid) {
        setConnected((c) => ({ ...c, [connecting]: formValues }))
        setConnecting(null)
      } else {
        setStatus('error')
        setErrorMessage(result.message || 'Those credentials were rejected.')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(err?.response?.data?.detail || 'Could not reach the backend to validate this.')
    }
  }

  const activeTool = MCP_TOOLS.find((t) => t.id === connecting)
  const allFieldsFilled = activeTool?.fields.every((f) => formValues[f.key]?.trim())

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">MCP Tools</h1>
        <p className="text-slate-500 text-sm mt-1">
          Connect your project-management and test-management tools once. Any agent or agentic process can then read,
          create, update, or delete data in them — just describe the action in plain English (e.g. "delete test case QA-42").
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MCP_TOOLS.map((tool) => (
          <div key={tool.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: tool.color }}>
                {tool.label[0]}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{tool.label}</h3>
                {connected[tool.id] && (
                  <span className="text-[11px] text-emerald-600 flex items-center gap-1"><FiCheck /> Connected</span>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-500 flex-1">{tool.description}</p>
            <button
              onClick={() => openConnect(tool)}
              className={`text-sm font-medium rounded-lg py-2 ${
                connected[tool.id] ? 'bg-slate-100 text-slate-600' : 'bg-indigo-600 text-white'
              }`}
            >
              {connected[tool.id] ? 'Reconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>

      {activeTool && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-indigo-600 text-white p-5 flex items-center gap-3">
              <FiShield size={20} />
              <div>
                <p className="font-semibold">Connect {activeTool.label}</p>
                <p className="text-xs text-indigo-100">Credentials are checked live before this counts as connected</p>
              </div>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <p className="text-sm font-medium text-slate-700">This application will be able to:</p>
              <ul className="flex flex-col gap-1.5">
                {activeTool.scopes.map((s) => (
                  <li key={s} className="text-sm text-slate-600 flex items-center gap-2"><FiCheck className="text-emerald-500" /> {s}</li>
                ))}
              </ul>

              <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
                {activeTool.fields.map((f) => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">{f.label}</label>
                    <input
                      type={f.mask ? 'password' : 'text'}
                      placeholder={f.placeholder}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      value={formValues[f.key] || ''}
                      onChange={(e) => setFormValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {status === 'error' && (
                <p className="text-xs text-red-600 flex items-center gap-1.5"><FiAlertCircle /> {errorMessage}</p>
              )}

              <div className="flex gap-3 mt-2">
                <button onClick={() => setConnecting(null)} className="flex-1 border border-slate-300 rounded-lg py-2 text-sm font-medium text-slate-600">
                  Cancel
                </button>
                <button
                  onClick={confirmConnect}
                  disabled={!allFieldsFilled || status === 'validating'}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {status === 'validating' ? <><FiLoader className="animate-spin" /> Validating...</> : 'Authorize & Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
