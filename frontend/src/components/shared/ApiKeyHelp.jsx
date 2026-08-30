import React, { useState } from 'react'
import { FiHelpCircle, FiChevronDown, FiChevronUp, FiExternalLink } from 'react-icons/fi'

export default function ApiKeyHelp({ steps, consoleUrl, keyFormatHint, label = "Don't know the API Token? How to get one?" }) {
  const [open, setOpen] = useState(false)
  if (!steps || steps.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100/60 transition-colors"
      >
        <FiHelpCircle className="shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 text-sm text-slate-700">
          <ol className="list-decimal list-inside space-y-1.5">
            {steps.map((s, i) => (
              <li key={i} className="leading-snug">{s}</li>
            ))}
          </ol>
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            {keyFormatHint && (
              <span className="text-xs text-slate-500">Format hint: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{keyFormatHint}</code></span>
            )}
            {consoleUrl && (
              <a
                href={consoleUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900"
              >
                Open console <FiExternalLink />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
