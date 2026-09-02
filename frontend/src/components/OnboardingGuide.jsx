import React, { useState } from 'react'
import { FiX, FiArrowRight, FiCheckCircle, FiRefreshCw } from 'react-icons/fi'
import { AI_MODELS, getProvider } from '../data/aiModels'
import { generateOnboardingPlan } from '../api/client'

const PROMPTS = [
  "What's your plan, buddy?",
  'What do you want to do?',
  'Give me your scope of work.',
  "Explain your work so I can suggest how to use this platform effectively.",
]

export default function OnboardingGuide({ open, onClose }) {
  const [provider, setProvider] = useState(() => localStorage.getItem('qa_chatbot_provider') || '')
  const [version, setVersion] = useState(() => localStorage.getItem('qa_chatbot_version') || '')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('qa_chatbot_key') || '')
  const [configuring, setConfiguring] = useState(!apiKey)

  const [goal, setGoal] = useState('')
  const [steps, setSteps] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const providerDef = getProvider(provider)
  const promptLine = PROMPTS[Math.floor((Date.now() / 60000) % PROMPTS.length)]

  if (!open) return null

  const saveConfig = () => {
    localStorage.setItem('qa_chatbot_provider', provider)
    localStorage.setItem('qa_chatbot_version', version)
    localStorage.setItem('qa_chatbot_key', apiKey)
    setConfiguring(false)
  }

  const askForPlan = async () => {
    if (!goal.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await generateOnboardingPlan({ provider, model_version: version, api_key: apiKey, goal })
      setSteps(result.steps)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not generate a plan. Check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setSteps(null); setGoal(''); setError('') }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <p className="font-semibold">{promptLine}</p>
            <p className="text-xs text-indigo-100 mt-0.5">Tell us your goal, get a step-by-step plan for this platform</p>
          </div>
          <button onClick={onClose}><FiX /></button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {configuring ? (
            <>
              <p className="text-xs text-slate-500">Pick an AI engine and paste your own API key to generate your plan — it's never stored on our server.</p>
              <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={provider} onChange={(e) => { setProvider(e.target.value); setVersion('') }}>
                <option value="">Select AI engine...</option>
                {AI_MODELS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              {providerDef && (
                <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={version} onChange={(e) => setVersion(e.target.value)}>
                  <option value="">Select version...</option>
                  {providerDef.versions.map((v) => <option key={v.id} value={v.id}>{v.label}{v.free ? ' (Free tier)' : ''}</option>)}
                </select>
              )}
              <input type="password" placeholder="API Token" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <button onClick={saveConfig} disabled={!provider || !version || !apiKey} className="bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-40">
                Continue
              </button>
            </>
          ) : !steps ? (
            <>
              <textarea
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm h-28"
                placeholder="e.g. I want to automatically pull user stories from Jira, generate test cases with AI, and upload them to TestRail."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={askForPlan}
                disabled={!goal.trim() || loading}
                className="bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? 'Thinking...' : <>Get my plan <FiArrowRight /></>}
              </button>
              <button onClick={() => setConfiguring(true)} className="text-xs text-slate-400 self-start">Change AI engine / key</button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">Here's how to get there on this platform:</p>
              <div className="flex flex-col gap-3">
                {steps.map((s, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                      <p className="text-sm text-slate-500">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={reset} className="flex-1 border border-slate-300 rounded-lg py-2 text-sm font-medium text-slate-600 flex items-center justify-center gap-1.5">
                  <FiRefreshCw size={13} /> Ask something else
                </button>
                <button onClick={onClose} className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5">
                  <FiCheckCircle size={14} /> Got it
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
