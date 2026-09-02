import React from 'react'

export function AgentIllustration({ className = 'w-full h-32' }) {
  return (
    <svg viewBox="0 0 200 120" className={className}>
      <defs>
        <linearGradient id="agentGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="60" r="46" fill="url(#agentGrad)" opacity="0.15" />
      <rect x="70" y="40" width="60" height="46" rx="14" fill="url(#agentGrad)" />
      <circle cx="88" cy="62" r="6" fill="white" />
      <circle cx="112" cy="62" r="6" fill="white" />
      <rect x="92" y="76" width="16" height="4" rx="2" fill="white" opacity="0.8" />
      <rect x="96" y="24" width="8" height="16" rx="4" fill="url(#agentGrad)" />
      <circle cx="100" cy="20" r="6" fill="url(#agentGrad)" />
      <rect x="54" y="54" width="12" height="20" rx="6" fill="url(#agentGrad)" />
      <rect x="134" y="54" width="12" height="20" rx="6" fill="url(#agentGrad)" />
    </svg>
  )
}

export function ChatbotIllustration({ className = 'w-full h-32' }) {
  return (
    <svg viewBox="0 0 200 120" className={className}>
      <defs>
        <linearGradient id="chatGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="40" y="30" width="90" height="60" rx="16" fill="url(#chatGrad)" opacity="0.9" />
      <path d="M55 90 L55 104 L75 90 Z" fill="url(#chatGrad)" opacity="0.9" />
      <circle cx="65" cy="58" r="5" fill="white" />
      <circle cx="85" cy="58" r="5" fill="white" />
      <circle cx="105" cy="58" r="5" fill="white" />
      <rect x="120" y="18" width="46" height="34" rx="12" fill="url(#chatGrad)" opacity="0.4" />
      <circle cx="132" cy="34" r="3.5" fill="white" />
      <circle cx="143" cy="34" r="3.5" fill="white" />
      <circle cx="154" cy="34" r="3.5" fill="white" />
    </svg>
  )
}

export function AgenticProcessIllustration({ className = 'w-full h-32' }) {
  return (
    <svg viewBox="0 0 200 120" className={className}>
      <defs>
        <linearGradient id="chainGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <circle cx="35" cy="60" r="20" fill="url(#chainGrad)" />
      <circle cx="100" cy="60" r="20" fill="url(#chainGrad)" opacity="0.75" />
      <circle cx="165" cy="60" r="20" fill="url(#chainGrad)" opacity="0.5" />
      <line x1="55" y1="60" x2="80" y2="60" stroke="url(#chainGrad)" strokeWidth="4" strokeDasharray="6 5" />
      <line x1="120" y1="60" x2="145" y2="60" stroke="url(#chainGrad)" strokeWidth="4" strokeDasharray="6 5" />
      <path d="M28 60 l5 5 l10 -10" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M93 60 l5 5 l10 -10" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx="165" cy="60" r="4" fill="white" />
    </svg>
  )
}
