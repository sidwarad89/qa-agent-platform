import React from 'react'
import { FiCheckCircle, FiCircle } from 'react-icons/fi'

export default function ProgressOverview({ items }) {
  const doneCount = items.filter((i) => i.done).length
  const pct = Math.round((doneCount / items.length) * 100)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700">Setup progress</span>
        <span className="text-sm font-medium text-slate-500">{doneCount}/{items.length} complete</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-gradient-to-r from-step1 via-step5 to-step7 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <span
            key={i.label}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
              i.done ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'
            }`}
          >
            {i.done ? <FiCheckCircle /> : <FiCircle />}
            {i.label}
          </span>
        ))}
      </div>
    </div>
  )
}
