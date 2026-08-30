import React from 'react'
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi'

export default function ExecutionLog({ events }) {
  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-sm h-80 overflow-y-auto">
      {events.length === 0 && <p className="text-slate-500">Agent output will appear here once you click "Build Agent".</p>}
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-2 mb-1">
          {e.status === 'running' && <FiLoader className="animate-spin text-yellow-400 mt-0.5 shrink-0" />}
          {e.status === 'success' && <FiCheckCircle className="text-green-400 mt-0.5 shrink-0" />}
          {e.status === 'error' && <FiXCircle className="text-red-400 mt-0.5 shrink-0" />}
          <span><span className="text-slate-400">[{e.step_name}]</span> {e.detail}</span>
        </div>
      ))}
    </div>
  )
}
