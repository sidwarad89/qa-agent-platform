import React, { useState } from 'react'
import {
  FiPlay, FiCheckCircle, FiRotateCcw, FiPaperclip, FiExternalLink, FiX,
} from 'react-icons/fi'
import { getProvider } from '../data/aiModels'
import { createAgenticProcess, runAgenticStep, approveAgenticStep } from '../api/client'

const TEXT_EXTENSIONS = ['txt', 'md', 'csv', 'json']

function readFileAsText(file) {
  return new Promise((resolve) => {
    const ext = file.name.split('.').pop().toLowerCase()
    if (!TEXT_EXTENSIONS.includes(ext)) {
      resolve(`[Attached file: ${file.name} - binary content not extracted, but flagged by reviewer for context]`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve(`[Could not read attached file: ${file.name}]`)
    reader.readAsText(file)
  })
}

export default function AgentRunPanel({ agent, onClose }) {
  const providerDef = getProvider(agent.ai_provider)
  const [apiKey, setApiKey] = useState('')
  const [processId, setProcessId] = useState(null)
  const [rs, setRs] = useState({}) // output, output_url, status, feedback, fileNote, fileName, running, commentTouched, error

  const hasFeedback = !!(rs.feedback || rs.fileNote)
  const goodToGoBlurred = hasFeedback || rs.commentTouched

  const run = async (pid, feedback = null) => {
    setRs((r) => ({ ...r, running: true }))
    try {
      const result = await runAgenticStep(pid, {
        step_index: 0,
        step_name: agent.name,
        prompt: agent.workflow_prompt || `Act as "${agent.name}" and produce its output.`,
        ai_provider: agent.ai_provider,
        ai_model_version: agent.ai_model_version,
        ai_api_key: apiKey,
        previous_output: null,
        feedback,
      })
      setRs({
        output: result.output, output_url: result.output_url, status: 'awaiting_review',
        feedback: '', fileNote: '', fileName: '', running: false, commentTouched: false,
      })
    } catch (err) {
      setRs((r) => ({ ...r, running: false, error: err?.response?.data?.detail || 'Run failed.' }))
    }
  }

  const start = async () => {
    const proc = await createAgenticProcess(`${agent.name} — single run`)
    setProcessId(proc.id)
    await run(proc.id)
  }

  const handleGoodToGo = async () => {
    await approveAgenticStep(processId, 0)
    setRs((r) => ({ ...r, status: 'approved' }))
  }

  const handleReExecute = async () => {
    const feedbackCombined = [rs.feedback, rs.fileNote].filter(Boolean).join('\n')
    await run(processId, feedbackCombined || 'Please regenerate with more care and precision.')
  }

  const handleFileAttach = async (file) => {
    if (!file) return
    const note = await readFileAsText(file)
    setRs((r) => ({ ...r, fileNote: note, fileName: file.name }))
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white p-5 flex items-center justify-between sticky top-0">
          <div>
            <p className="font-semibold">Run: {agent.name}</p>
            <p className="text-xs text-indigo-100">{agent.ai_provider} · {agent.ai_model_version}</p>
          </div>
          <button onClick={onClose}><FiX /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {!processId && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">API Key for {providerDef?.label || agent.ai_provider}</label>
                <input
                  type="password" className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  placeholder={providerDef?.keyFormatHint}
                />
              </div>
              <button
                onClick={start}
                disabled={!apiKey}
                className="self-start px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2"
              >
                <FiPlay /> Run Agent
              </button>
            </>
          )}

          {rs.running && <p className="text-sm text-slate-400">Running agent...</p>}
          {rs.error && <p className="text-sm text-red-600">{rs.error}</p>}

          {rs.output && (
            <>
              {rs.output_url ? (
                <a
                  href={rs.output_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-sm text-blue-700 font-medium hover:bg-blue-100"
                >
                  <FiExternalLink /> Verify in Jira — {rs.output_url.split('/').pop()}
                </a>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {rs.output}
                </div>
              )}

              {rs.status === 'awaiting_review' && (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-500">
                    Verify this output. Add a comment or attach a doc if it needs changes, then Re-Execute — or approve it as-is.
                  </p>
                  <textarea
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm h-16"
                    placeholder="Optional: describe what to fix..."
                    value={rs.feedback || ''}
                    onFocus={() => setRs((r) => ({ ...r, commentTouched: true }))}
                    onChange={(e) => setRs((r) => ({ ...r, feedback: e.target.value }))}
                  />
                  <label className="text-xs text-indigo-600 flex items-center gap-1 cursor-pointer w-fit">
                    <FiPaperclip /> {rs.fileName || 'Attach a doc (any file type)'}
                    <input type="file" className="hidden" onChange={(e) => { setRs((r) => ({ ...r, commentTouched: true })); handleFileAttach(e.target.files?.[0]) }} />
                  </label>

                  <div className="flex gap-3">
                    <button
                      onClick={handleGoodToGo}
                      disabled={goodToGoBlurred}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        goodToGoBlurred
                          ? 'bg-slate-100 text-slate-400 opacity-40 pointer-events-none blur-[0.5px]'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      <FiCheckCircle /> Good to go
                    </button>
                    <button
                      onClick={handleReExecute}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        hasFeedback
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-300 ring-2 ring-amber-300 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <FiRotateCcw /> Re-Execute
                    </button>
                  </div>
                </div>
              )}

              {rs.status === 'approved' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm font-medium flex items-center gap-2">
                  <FiCheckCircle /> Approved — this output is final.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
