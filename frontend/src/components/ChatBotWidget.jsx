import React, { useState } from 'react'
import { FiX, FiSend } from 'react-icons/fi'

export default function ChatBotWidget({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your QA Agent assistant. Ask me about building agents, connecting MCP tools, or setting up an agentic process." },
  ])
  const [input, setInput] = useState('')

  const send = () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input }
    setMessages((m) => [...m, userMsg, {
      role: 'assistant',
      text: "This chatbot is a placeholder wired to the UI — connect it to your backend's AI provider endpoint to make it fully functional.",
    }])
    setInput('')
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">QA Assistant</span>
        <button onClick={onClose}><FiX /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm px-3 py-2 rounded-lg max-w-[85%] ${
              m.role === 'user' ? 'bg-indigo-600 text-white self-end' : 'bg-slate-100 text-slate-700 self-start'
            }`}
          >
            {m.text}
          </div>
        ))}
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
