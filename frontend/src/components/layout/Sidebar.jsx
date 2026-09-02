import React, { useState } from 'react'
import {
  FiHome, FiTool, FiShare2, FiGrid, FiUser, FiLogOut, FiMessageSquare, FiShield, FiCpu, FiDroplet,
} from 'react-icons/fi'
import { useTheme, THEMES } from '../../context/ThemeContext'

const NAV_ITEMS = [
  { id: 'myspace', label: 'My Space', icon: FiHome },
  { id: 'build', label: 'Build', icon: FiTool },
  { id: 'agents', label: 'Agents', icon: FiCpu },
  { id: 'mcp', label: 'MCP Tools', icon: FiShare2 },
  { id: 'agentic', label: 'Agentic Process', icon: FiGrid },
  { id: 'profile', label: 'Profile', icon: FiUser },
]

export default function Sidebar({ active, onNavigate, username, isAdmin, onLogout, onToggleChat }) {
  const { theme, themeId, setThemeId } = useTheme()
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const items = isAdmin ? [...NAV_ITEMS, { id: 'manage', label: 'Manage', icon: FiShield }] : NAV_ITEMS

  return (
    <aside className="w-20 shrink-0 bg-slate-950 flex flex-col items-center py-5 gap-4 relative">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">Q</div>

      <nav className="flex-1 flex flex-col gap-1 items-center overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors shrink-0 ${
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
        className="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 shrink-0"
      >
        <FiMessageSquare size={18} />
        <span className="text-[9px] leading-none">Chat</span>
      </button>

      <div className="relative shrink-0">
        <button
          onClick={() => setThemePickerOpen((o) => !o)}
          title="Select background theme"
          className="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <FiDroplet size={18} />
          <span className="text-[9px] leading-none">Theme</span>
        </button>
        {themePickerOpen && (
          <div className="absolute bottom-0 left-16 bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-48 z-50">
            <p className="text-xs font-semibold text-slate-500 mb-2">Background Theme</p>
            <div className="flex flex-col gap-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setThemeId(t.id); setThemePickerOpen(false) }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
                    themeId === t.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: t.swatch }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-800 w-full shrink-0">
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
