import React, { useState } from 'react'
import { FiX, FiSend, FiSettings } from 'react-icons/fi'
import { AI_MODELS, getProvider } from '../data/aiModels'
import { sendChatbotMessage } from '../api/client'
import { ChatbotIllustration } from './illustrations/Illustrations'

export default function ChatBotWidget({ open, onClose }) {
  const [provider, setProvider] = useState(() => localStorage.getItem('qa_chatbot_provider') || '')
  const [version, setVersion] = useState(() => localStorage.getItem('qa_chatbot_version') || '')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('qa_chatbot_key') || '')
  const [configuring, setConfiguring] = useState(!apiKey)

  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your QA Agent assistant. Ask me anything about this platform — how Build, MCP Tools, or Agentic Process work." },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const providerDef = getProvider(provider)

  const saveConfig = () => {
    localStorage.setItem('qa_chatbot_provider', provider)
    localStorage.setItem('qa_chatbot_version', version)
    localStorage.setItem('qa_chatbot_key', apiKey)
    setConfiguring(false)
  }

  const send = async () => {
    if (!input.trim() || sending) return
    const userMsg = { role: 'user', text: input }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setSending(true)
    try {
      const { reply } = await sendChatbotMessage({
        provider, model_version: version, api_key: apiKey,
        message: userMsg.text,
        history: history.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      })
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: err?.response?.data?.detail || "Couldn't reach the AI provider — check your API key." }])
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[26rem] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">QA Assistant</span>
        <div className="flex items-center gap-2">
          {apiKey && (
            <button onClick={() => setConfiguring(true)} title="Change AI engine / key"><FiSettings size={14} /></button>
          )}
          <button onClick={onClose}><FiX /></button>
        </div>
      </div>

      {configuring ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <ChatbotIllustration className="w-full h-20" />
          <p className="text-xs text-slate-500">Pick an AI engine and paste your own API key — the chatbot uses it to answer your questions, it's never stored on our server.</p>
          <select className="border border-slate-300 rounded-lg px-2 py-2 text-sm" value={provider} onChange={(e) => { setProvider(e.target.value); setVersion('') }}>
            <option value="">Select AI engine...</option>
            {AI_MODELS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {providerDef && (
            <select className="border border-slate-300 rounded-lg px-2 py-2 text-sm" value={version} onChange={(e) => setVersion(e.target.value)}>
              <option value="">Select version...</option>
              {providerDef.versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          )}
          <input
            type="password" placeholder="API Token"
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm"
            value={apiKey} onChange={(e) => setApiKey(e.target.value)}
          />
          <button
            onClick={saveConfig}
            disabled={!provider || !version || !apiKey}
            className="bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40"
          >
            Save & Start Chatting
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-lg max-w-[85%] whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-indigo-600 text-white self-end' : 'bg-slate-100 text-slate-700 self-start'
                }`}
              >
                {m.text}
              </div>
            ))}
            {sending && <div className="text-xs text-slate-400 self-start px-2">Thinking...</div>}
          </div>
          <div className="p-2 border-t border-slate-200 flex gap-2">
            <input
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Ask something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button onClick={send} className="bg-indigo-600 text-white rounded-lg px-3"><FiSend size={16} /></button>
          </div>
        </>
      )}
    </div>
  )
}
