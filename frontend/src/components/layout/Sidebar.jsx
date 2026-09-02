import React from 'react'
import {
  FiHome, FiTool, FiShare2, FiGrid, FiUser, FiLogOut, FiMessageSquare,
} from 'react-icons/fi'

const NAV_ITEMS = [
  { id: 'myspace', label: 'My Space', icon: FiHome },
  { id: 'build', label: 'Build', icon: FiTool },
  { id: 'mcp', label: 'MCP Tools', icon: FiShare2 },
  { id: 'agentic', label: 'Agentic Process', icon: FiGrid },
  { id: 'profile', label: 'Profile', icon: FiUser },
]

export default function Sidebar({ active, onNavigate, username, onLogout, onToggleChat }) {
  return (
    <aside className="w-20 shrink-0 bg-slate-950 flex flex-col items-center py-5 gap-6">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">Q</div>

      <nav className="flex-1 flex flex-col gap-1 items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] leading-none text-center px-1">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <button
        onClick={onToggleChat}
        title="Chatbot"
        className="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      >
        <FiMessageSquare size={18} />
        <span className="text-[9px] leading-none">Chat</span>
      </button>

      <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-800 w-full">
        <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-semibold">
          {username?.[0]?.toUpperCase() || 'U'}
        </div>
        <button onClick={onLogout} title="Log out" className="text-slate-500 hover:text-red-400">
          <FiLogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
