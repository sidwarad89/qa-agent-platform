import React, { useState } from 'react'
import { FiPlus, FiTrash2, FiPlay, FiCheckCircle, FiRotateCcw, FiPaperclip } from 'react-icons/fi'
import { AI_MODELS, getProvider } from '../data/aiModels'
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

export default function AgenticProcessPage() {
  const [phase, setPhase] = useState('setup') // setup | running
  const [processName, setProcessName] = useState('')
  const [provider, setProvider] = useState('anthropic')
  const [version, setVersion] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [stepDefs, setStepDefs] = useState([{ name: 'Generate test scenarios', prompt: '' }])

  const [processId, setProcessId] = useState(null)
  const [runtimeSteps, setRuntimeSteps] = useState([]) // { output, status, feedback, fileNote, running }
  const [activeIndex, setActiveIndex] = useState(0)

  const providerDef = getProvider(provider)

  const addStepDef = () => setStepDefs((s) => [...s, { name: `Step ${s.length + 1}`, prompt: '' }])
  const removeStepDef = (i) => setStepDefs((s) => s.filter((_, idx) => idx !== i))
  const updateStepDef = (i, key, value) => setStepDefs((s) => s.map((st, idx) => (idx === i ? { ...st, [key]: value } : st)))

  const runStep = async (index, feedback = null) => {
    setRuntimeSteps((rs) => {
      const copy = [...rs]
      copy[index] = { ...(copy[index] || {}), running: true }
      return copy
    })

    const previousOutput = index > 0 ? runtimeSteps[index - 1]?.output : null

    try {
      const result = await runAgenticStep(processId, {
        step_index: index,
        step_name: stepDefs[index].name,
        prompt: stepDefs[index].prompt,
        ai_provider: provider,
        ai_model_version: version,
        ai_api_key: apiKey,
        previous_output: previousOutput,
        feedback,
      })
      setRuntimeSteps((rs) => {
        const copy = [...rs]
        copy[index] = { output: result.output, status: 'awaiting_review', feedback: '', fileNote: '', running: false }
        return copy
      })
      setActiveIndex(index)
    } catch (err) {
      setRuntimeSteps((rs) => {
        const copy = [...rs]
        copy[index] = { ...(copy[index] || {}), running: false, error: err?.response?.data?.detail || 'Step failed.' }
        return copy
      })
    }
  }

  const startProcess = async () => {
    const proc = await createAgenticProcess(processName || 'Untitled Process')
    setProcessId(proc.id)
    setPhase('running')
    setRuntimeSteps(stepDefs.map(() => ({})))
    await runStep(0)
  }

  const handleGoodToGo = async (index) => {
    await approveAgenticStep(processId, index)
    setRuntimeSteps((rs) => {
      const copy = [...rs]
      copy[index] = { ...copy[index], status: 'approved' }
      return copy
    })
    if (index + 1 < stepDefs.length) {
      await runStep(index + 1)
    }
  }

  const handleRetry = async (index) => {
    const step = runtimeSteps[index]
    const feedbackCombined = [step.feedback, step.fileNote].filter(Boolean).join('\n')
    await runStep(index, feedbackCombined || 'Please regenerate with more care and precision.')
  }

  const handleFileAttach = async (index, file) => {
    if (!file) return
    const note = await readFileAsText(file)
    setRuntimeSteps((rs) => {
      const copy = [...rs]
      copy[index] = { ...copy[index], fileNote: note, fileName: file.name }
      return copy
    })
  }

  // ---- Setup screen ----
  if (phase === 'setup') {
    return (
      <div className="max-w-3xl mx-auto py-10 px-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">New Agentic Process</h1>
          <p className="text-slate-500 text-sm mt-1">
            Chain agents together. After each step, you'll review the output and choose "Good to go" to continue,
            or add feedback and "Retry" to regenerate that step.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">Process name</label>
            <input className="border border-slate-300 rounded-lg px-3 py-2" value={processName} onChange={(e) => setProcessName(e.target.value)} placeholder="e.g. Scenario → Test Case → Script pipeline" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600">AI Provider</label>
              <select className="border border-slate-300 rounded-lg px-3 py-2" value={provider} onChange={(e) => { setProvider(e.target.value); setVersion('') }}>
                {AI_MODELS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600">Model version</label>
              <select className="border border-slate-300 rounded-lg px-3 py-2" value={version} onChange={(e) => setVersion(e.target.value)}>
                <option value="">Select...</option>
                {providerDef?.versions.map((v) => <option key={v.id} value={v.id}>{v.label}{v.free ? ' (Free tier)' : ''}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">API Key</label>
            <input type="password" className="border border-slate-300 rounded-lg px-3 py-2" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={providerDef?.keyFormatHint} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Agent Steps</h2>
            <button onClick={addStepDef} className="text-sm text-indigo-600 flex items-center gap-1"><FiPlus /> Add step</button>
          </div>
          {stepDefs.map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <input className="flex-1 border-b border-slate-200 px-1 py-1 text-sm font-medium" value={s.name} onChange={(e) => updateStepDef(i, 'name', e.target.value)} />
                {stepDefs.length > 1 && (
                  <button onClick={() => removeStepDef(i)} className="text-slate-400 hover:text-red-500"><FiTrash2 size={14} /></button>
                )}
              </div>
              <textarea
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-20"
                placeholder="What should this agent do? (e.g. Generate 10-15 test scenarios covering positive, negative, and edge cases for the login flow.)"
                value={s.prompt}
                onChange={(e) => updateStepDef(i, 'prompt', e.target.value)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={startProcess}
          disabled={!processName || !version || !apiKey || stepDefs.some((s) => !s.prompt)}
          className="self-start px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2"
        >
          <FiPlay /> Start Process
        </button>
      </div>
    )
  }

  // ---- Running / review screen ----
  return (
    <div className="max-w-3xl mx-auto py-10 px-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-800">{processName}</h1>

      {stepDefs.map((def, i) => {
        const rs = runtimeSteps[i] || {}
        if (!rs.output && !rs.running && !rs.error) return null // not reached yet
        const hasFeedback = !!(rs.feedback || rs.fileNote)

        return (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <h3 className="font-semibold text-slate-800">{def.name}</h3>
              {rs.status === 'approved' && <span className="text-xs text-emerald-600 flex items-center gap-1 ml-auto"><FiCheckCircle /> Approved</span>}
            </div>

            {rs.running && <p className="text-sm text-slate-400">Running agent...</p>}
            {rs.error && <p className="text-sm text-red-600">{rs.error}</p>}

            {rs.output && (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {rs.output}
                </div>

                {rs.status === 'awaiting_review' && (
                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium text-slate-500">Verify this output. Add a comment or attach a doc if it needs changes, then Retry — or approve it as-is.</p>
                    <textarea
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm h-16"
                      placeholder="Optional: describe what to fix..."
                      value={rs.feedback || ''}
                      onChange={(e) => setRuntimeSteps((prev) => {
                        const copy = [...prev]; copy[i] = { ...copy[i], feedback: e.target.value }; return copy
                      })}
                    />
                    <label className="text-xs text-indigo-600 flex items-center gap-1 cursor-pointer w-fit">
                      <FiPaperclip /> {rs.fileName || 'Attach a doc (any file type)'}
                      <input type="file" className="hidden" onChange={(e) => handleFileAttach(i, e.target.files?.[0])} />
                    </label>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleGoodToGo(i)}
                        disabled={hasFeedback}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                          hasFeedback
                            ? 'bg-slate-100 text-slate-400 opacity-40 pointer-events-none blur-[0.5px]'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        <FiCheckCircle /> Good to go
                      </button>
                      <button
                        onClick={() => handleRetry(i)}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                          hasFeedback
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-300 ring-2 ring-amber-300 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <FiRotateCcw /> Retry
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}

      {runtimeSteps[stepDefs.length - 1]?.status === 'approved' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-700 text-sm font-medium">
          🎉 Process complete — every step has been approved.
        </div>
      )}
    </div>
  )
}
