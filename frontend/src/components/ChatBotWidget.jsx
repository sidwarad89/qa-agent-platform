import React, { useState } from 'react'
import { FiX, FiSend } from 'react-icons/fi'
import { sendChatbotMessage } from '../api/client'

export default function ChatBotWidget({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your QA Agent assistant. Ask me anything about this platform — how Build, MCP Tools, or Agentic Process work." },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!input.trim() || sending) return
    const userMsg = { role: 'user', text: input }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setSending(true)
    try {
      const { reply } = await sendChatbotMessage({
        message: userMsg.text,
        history: history.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      })
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: err?.response?.data?.detail || "Couldn't reach the chatbot right now." }])
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[26rem] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">QA Assistant</span>
        <button onClick={onClose}><FiX /></button>
      </div>

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
    </div>
  )
}
