import React from 'react'

export default function AssistantToggle({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Have a doubt? Ask the assistant"
      className="fixed top-20 right-6 z-40 flex flex-col items-center gap-1.5 group"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform">
        <svg viewBox="0 0 40 40" className="w-7 h-7">
          <rect x="17" y="3" width="6" height="8" rx="3" fill="white" />
          <circle cx="20" cy="4" r="2.4" fill="white" />
          <rect x="6" y="10" width="28" height="23" rx="11" fill="white" />
          <ellipse className="robot-eye" cx="15.5" cy="21.5" rx="2.6" ry="3.6" fill="#4338ca" />
          <ellipse className="robot-eye" cx="24.5" cy="21.5" rx="2.6" ry="3.6" fill="#4338ca" />
          <path d="M15 27.5 Q20 30.5 25 27.5" stroke="#4338ca" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-[11px] font-medium text-slate-600 bg-white px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
        Have Doubt ? Ask me
      </span>
    </button>
  )
}
