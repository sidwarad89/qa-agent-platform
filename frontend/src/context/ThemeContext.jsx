import React, { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = [
  { id: 'default', label: 'Default', className: 'bg-slate-50', swatch: '#f8fafc' },
  { id: 'ocean', label: 'Ocean', className: 'bg-gradient-to-br from-sky-50 to-indigo-100', swatch: '#bae6fd' },
  { id: 'sunset', label: 'Sunset', className: 'bg-gradient-to-br from-orange-50 to-pink-100', swatch: '#fed7aa' },
  { id: 'forest', label: 'Forest', className: 'bg-gradient-to-br from-emerald-50 to-teal-100', swatch: '#a7f3d0' },
  { id: 'lavender', label: 'Lavender', className: 'bg-gradient-to-br from-violet-50 to-fuchsia-100', swatch: '#ddd6fe' },
  { id: 'midnight', label: 'Midnight', className: 'bg-gradient-to-br from-slate-900 to-indigo-950 dark-content', swatch: '#1e293b' },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => localStorage.getItem('qa_agent_theme') || 'default')

  useEffect(() => {
    localStorage.setItem('qa_agent_theme', themeId)
  }, [themeId])

  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0]

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
