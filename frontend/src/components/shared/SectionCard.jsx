import React from 'react'
import { FiCheck } from 'react-icons/fi'

export default function SectionCard({ index, title, subtitle, accent = '#6366f1', done, icon: Icon, children, className = '' }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0 text-sm"
          style={{ backgroundColor: accent }}
        >
          {done ? <FiCheck /> : (Icon ? <Icon /> : index)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {done && (
          <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full whitespace-nowrap">
            Ready
          </span>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}
