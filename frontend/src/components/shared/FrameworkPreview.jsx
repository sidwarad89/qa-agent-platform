import React, { useState } from 'react'
import { FiCode, FiFolder } from 'react-icons/fi'

export default function FrameworkPreview({ framework }) {
  const [tab, setTab] = useState('sample')

  if (!framework || (!framework.sample && !framework.fileTree)) return null

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setTab('sample')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors ${
            tab === 'sample' ? 'text-step5 border-b-2 border-step5 bg-white' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FiCode /> Sample code
        </button>
        <button
          type="button"
          onClick={() => setTab('tree')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors ${
            tab === 'tree' ? 'text-step5 border-b-2 border-step5 bg-white' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FiFolder /> Sample file structure
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 text-xs leading-relaxed p-4 overflow-x-auto max-h-72 overflow-y-auto">
        <code>{tab === 'sample' ? framework.sample : framework.fileTree}</code>
      </pre>
    </div>
  )
}
