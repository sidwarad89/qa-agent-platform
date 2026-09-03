import React, { useEffect, useState } from 'react'
import {
  FiPlus, FiTrash2, FiPlay, FiCheckCircle, FiRotateCcw, FiPaperclip, FiExternalLink, FiLink, FiZap,
  FiCpu, FiGrid, FiChevronDown, FiChevronUp,
} from 'react-icons/fi'
import { fetchMyAgents, createAgenticProcess, runAgenticStep, approveAgenticStep } from '../api/client'
import { getProvider } from '../data/aiModels'
import { GoldenChainIllustration } from '../components/illustrations/Illustrations'

const TEXT_EXTENSIONS = ['txt', 'md', 'csv', 'json']

function CollapsiblePanel({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50"
      >
        <Icon className="text-indigo-500" size={16} />
        <span className="flex-1 text-sm font-semibold text-slate-700">{title}</span>
        {open ? <FiChevronUp className="text-slate-400" /> : <FiChevronDown className="text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function FlowNode({ label, isStart }) {
  return (
    <div className={`flex items-center justify-center rounded-full font-semibold text-sm shrink-0 ${
      isStart ? 'w-24 h-24 bg-white border-2 border-slate-300 text-slate-700 text-center' : ''
    }`}>
      {label}
    </div>
  )
}

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
  const [myAgents, setMyAgents] = useState([])
  const [phase, setPhase] = useState('setup') // setup | running
  const [processName, setProcessName] = useState('')

  // chain: [{ agentId, hilEnabled, mcpEnabled, mcp: {...} }]
  const [chain, setChain] = useState([])
  const [apiKeys, setApiKeys] = useState({}) // { [provider]: key }

  const [processId, setProcessId] = useState(null)
  const [startError, setStartError] = useState('')
  // per index: { output, output_url, status, feedback, fileNote, fileName, running, commentTouched, error }
  const [runtimeSteps, setRuntimeSteps] = useState([])

  useEffect(() => { fetchMyAgents().then(setMyAgents).catch(() => {}) }, [])

  const getAgent = (id) => myAgents.find((a) => a.id === Number(id))

  const addChainItem = (agentId) => setChain((c) => [...c, {
    agentId: agentId ?? (myAgents[0]?.id || ''), hilEnabled: true, mcpEnabled: false,
    mcp: { base_url: '', username: '', api_key: '', project_key: '', parent_item_id: '' },
  }])
  const removeChainItem = (i) => setChain((c) => c.filter((_, idx) => idx !== i))
  const updateChainItem = (i, key, value) => setChain((c) => c.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)))
  const updateChainMcp = (i, key, value) => setChain((c) => c.map((item, idx) => (idx === i ? { ...item, mcp: { ...item.mcp, [key]: value } } : item)))

  const usedProviders = [...new Set(chain.map((c) => getAgent(c.agentId)?.ai_provider).filter(Boolean))]

  const runStep = async (index, feedback = null) => {
    const item = chain[index]
    const agent = getAgent(item.agentId)
    if (!agent) return

    setRuntimeSteps((rs) => {
      const copy = [...rs]
      copy[index] = { ...(copy[index] || {}), running: true }
      return copy
    })

    const previousOutput = index > 0 ? runtimeSteps[index - 1]?.output : null

    try {
      const result = await runAgenticStep(processId, {
        step_index: index,
        step_name: agent.name,
        prompt: agent.workflow_prompt || `Act as "${agent.name}" and produce its output.`,
        ai_provider: agent.ai_provider,
        ai_model_version: agent.ai_model_version,
        ai_api_key: apiKeys[agent.ai_provider] || '',
        previous_output: previousOutput,
        feedback,
        mcp_tool: item.mcpEnabled ? 'jira' : null,
        mcp_credentials: item.mcpEnabled ? item.mcp : null,
        mcp_parent_item_id: item.mcpEnabled ? item.mcp.parent_item_id : null,
      })
      setRuntimeSteps((rs) => {
        const copy = [...rs]
        copy[index] = {
          output: result.output, output_url: result.output_url, status: 'awaiting_review',
          feedback: '', fileNote: '', fileName: '', running: false, commentTouched: false,
        }
        return copy
      })

      if (!item.hilEnabled) {
        // No checkpoint here - auto-approve and continue straight to the next agent.
        await approveAgenticStep(processId, index)
        setRuntimeSteps((rs) => {
          const copy = [...rs]; copy[index] = { ...copy[index], status: 'approved' }; return copy
        })
        if (index + 1 < chain.length) await runStep(index + 1)
      }
    } catch (err) {
      setRuntimeSteps((rs) => {
        const copy = [...rs]
        copy[index] = { ...(copy[index] || {}), running: false, error: err?.response?.data?.detail || 'Step failed.' }
        return copy
      })
    }
  }

  const startProcess = async () => {
    setStartError('')
    try {
      const proc = await createAgenticProcess(processName || 'Untitled Process')
      setProcessId(proc.id)
      setPhase('running')
      setRuntimeSteps(chain.map(() => ({})))
      await runStep(0)
    } catch (err) {
      setStartError(err?.response?.data?.detail || 'Could not start the process. Please try again.')
    }
  }

  const handleGoodToGo = async (index) => {
    await approveAgenticStep(processId, index)
    setRuntimeSteps((rs) => {
      const copy = [...rs]; copy[index] = { ...copy[index], status: 'approved' }; return copy
    })
    if (index + 1 < chain.length) await runStep(index + 1)
  }

  const handleReExecute = async (index) => {
    const step = runtimeSteps[index]
    const feedbackCombined = [step.feedback, step.fileNote].filter(Boolean).join('\n')
    await runStep(index, feedbackCombined || 'Please regenerate with more care and precision.')
  }

  const handleFileAttach = async (index, file) => {
    if (!file) return
    const note = await readFileAsText(file)
    setRuntimeSteps((rs) => {
      const copy = [...rs]; copy[index] = { ...copy[index], fileNote: note, fileName: file.name }; return copy
    })
  }

  const touchComment = (index) => {
    setRuntimeSteps((rs) => {
      const copy = [...rs]; copy[index] = { ...copy[index], commentTouched: true }; return copy
    })
  }

  // ---- No agents built yet ----
  if (myAgents.length === 0 && phase === 'setup') {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 flex flex-col items-center text-center gap-4">
        <GoldenChainIllustration className="w-48 h-24" />
        <h1 className="text-2xl font-bold text-slate-800">No agents to chain yet</h1>
        <p className="text-slate-500 text-sm">Build at least one agent first — Agentic Process links your already-built agents together.</p>
      </div>
    )
  }

  // ---- Setup screen ----
  if (phase === 'setup') {
    return (
      <div className="max-w-6xl mx-auto py-8 px-6 flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <GoldenChainIllustration className="w-28 h-16 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">New Agentic Process</h1>
            <p className="text-slate-500 text-sm mt-1">
              Pick agents from the left panel to chain them together. Add a Human-in-Loop checkpoint wherever you
              want to review before continuing — skip it anywhere you want the chain to run straight through.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* Left panel: Process Information + My Agents picker */}
          <div className="flex flex-col gap-4">
            <CollapsiblePanel title="Process Information" icon={FiGrid} defaultOpen>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Name</label>
                <input
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={processName} onChange={(e) => setProcessName(e.target.value)}
                  placeholder="e.g. Scenario → Test Case → Uploader pipeline"
                />
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel title="My Agents" icon={FiCpu} defaultOpen>
              {myAgents.length === 0 ? (
                <p className="text-xs text-slate-400">No agents built yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                  {myAgents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => addChainItem(a.id)}
                      className="w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <span className="text-sm text-slate-700 truncate">{a.name}</span>
                      <FiPlus className="text-indigo-600 shrink-0" size={14} />
                    </button>
                  ))}
                </div>
              )}
            </CollapsiblePanel>

            {usedProviders.length > 0 && (
              <CollapsiblePanel title="API Keys" icon={FiCpu} defaultOpen>
                <p className="text-xs text-slate-500 -mt-1 mb-1">One key per AI engine used in this chain.</p>
                <div className="flex flex-col gap-2">
                  {usedProviders.map((p) => {
                    const def = getProvider(p)
                    return (
                      <div key={p} className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">{def?.label || p}</label>
                        <input
                          type="password" className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                          value={apiKeys[p] || ''} onChange={(e) => setApiKeys((k) => ({ ...k, [p]: e.target.value }))}
                          placeholder={def?.keyFormatHint}
                        />
                      </div>
                    )
                  })}
                </div>
              </CollapsiblePanel>
            )}
          </div>

          {/* Right: the flow canvas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 min-h-[420px]">
            <div className="relative flex flex-col items-start gap-0 pl-6">
              <FlowNode label="Start Flow" isStart />
              {chain.length === 0 && (
                <div className="ml-4 mt-2 text-sm text-slate-400 border border-dashed border-slate-300 rounded-xl px-4 py-6 max-w-md">
                  Click an agent on the left to add it here — it'll connect right below Start Flow.
                </div>
              )}
              {chain.map((item, i) => {
                const agent = getAgent(item.agentId)
                return (
                  <React.Fragment key={i}>
                    <div className="w-px h-8 bg-slate-300 ml-6" />
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{agent?.name || 'Unknown agent'}</p>
                          {agent && <p className="text-xs text-slate-400">{agent.ai_provider} · {agent.ai_model_version}</p>}
                        </div>
                        <button onClick={() => removeChainItem(i)} className="text-slate-400 hover:text-red-500 shrink-0"><FiTrash2 size={14} /></button>
                      </div>

                      <label className="flex items-center gap-2 text-xs text-slate-600 pl-9">
                        <input type="checkbox" checked={item.hilEnabled} onChange={(e) => updateChainItem(i, 'hilEnabled', e.target.checked)} />
                        Add Human-in-Loop checkpoint after this agent (pause for review)
                      </label>
                      {!item.hilEnabled && (
                        <p className="text-xs text-slate-400 pl-9 flex items-center gap-1"><FiZap size={11} /> Will auto-continue straight to the next agent</p>
                      )}

                      <label className="flex items-center gap-2 text-xs text-slate-500 pl-9">
                        <input type="checkbox" checked={item.mcpEnabled} onChange={(e) => updateChainItem(i, 'mcpEnabled', e.target.checked)} />
                        <FiLink size={12} /> Also push this agent's output into Jira as a subtask
                      </label>
                      {item.mcpEnabled && (
                        <div className="grid grid-cols-2 gap-2 ml-9 bg-white rounded-lg p-3 border border-slate-200">
                          <input className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs col-span-2" placeholder="Jira Base URL" value={item.mcp.base_url} onChange={(e) => updateChainMcp(i, 'base_url', e.target.value)} />
                          <input className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs" placeholder="Email" value={item.mcp.username} onChange={(e) => updateChainMcp(i, 'username', e.target.value)} />
                          <input type="password" className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs" placeholder="API Token" value={item.mcp.api_key} onChange={(e) => updateChainMcp(i, 'api_key', e.target.value)} />
                          <input className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs" placeholder="Project Key" value={item.mcp.project_key} onChange={(e) => updateChainMcp(i, 'project_key', e.target.value)} />
                          <input className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs" placeholder="Parent Issue ID" value={item.mcp.parent_item_id} onChange={(e) => updateChainMcp(i, 'parent_item_id', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

        {startError && <p className="text-sm text-red-600">{startError}</p>}

        <button
          onClick={startProcess}
          disabled={!processName || chain.length === 0 || usedProviders.some((p) => !apiKeys[p])}
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

      {chain.map((item, i) => {
        const agent = getAgent(item.agentId)
        const rs = runtimeSteps[i] || {}
        if (!rs.output && !rs.running && !rs.error) return null // not reached yet
        const hasFeedback = !!(rs.feedback || rs.fileNote)
        const goodToGoBlurred = hasFeedback || rs.commentTouched

        return (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <h3 className="font-semibold text-slate-800">{agent?.name}</h3>
              {rs.status === 'approved' && <span className="text-xs text-emerald-600 flex items-center gap-1 ml-auto"><FiCheckCircle /> Approved</span>}
              {!item.hilEnabled && rs.status === 'approved' && <span className="text-xs text-slate-400 flex items-center gap-1"><FiZap size={11} /> auto-continued</span>}
            </div>

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

                {item.hilEnabled && rs.status === 'awaiting_review' && (
                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium text-slate-500">
                      {rs.output_url
                        ? 'Verified in Jira and not quite right? Leave a comment or attach a doc below, then Re-Execute.'
                        : 'Verify this output. Add a comment or attach a doc if it needs changes, then Re-Execute — or approve it as-is.'}
                    </p>
                    <textarea
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm h-16"
                      placeholder="Optional: describe what to fix..."
                      value={rs.feedback || ''}
                      onFocus={() => touchComment(i)}
                      onChange={(e) => setRuntimeSteps((prev) => {
                        const copy = [...prev]; copy[i] = { ...copy[i], feedback: e.target.value }; return copy
                      })}
                    />
                    <label className="text-xs text-indigo-600 flex items-center gap-1 cursor-pointer w-fit">
                      <FiPaperclip /> {rs.fileName || 'Attach a doc (any file type)'}
                      <input type="file" className="hidden" onChange={(e) => { touchComment(i); handleFileAttach(i, e.target.files?.[0]) }} />
                    </label>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleGoodToGo(i)}
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
                        onClick={() => handleReExecute(i)}
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
              </>
            )}
          </div>
        )
      })}

      {runtimeSteps[chain.length - 1]?.status === 'approved' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-700 text-sm font-medium">
          🎉 Process complete — every agent in the chain has run.
        </div>
      )}
    </div>
  )
}
