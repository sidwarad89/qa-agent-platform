import React from 'react'

// Tailwind's JIT compiler only picks up class names that appear as complete
// static strings in the source — template-literal class names like
// `border-${accent}` get silently dropped from the build. This lookup map
// keeps every class name whole and statically scannable.
const ACCENT_CLASSES = {
  step1: { border: 'border-step1', bg: 'bg-step1/10', text: 'text-step1' },
  step2: { border: 'border-step2', bg: 'bg-step2/10', text: 'text-step2' },
  step3: { border: 'border-step3', bg: 'bg-step3/10', text: 'text-step3' },
  step4: { border: 'border-step4', bg: 'bg-step4/10', text: 'text-step4' },
  step5: { border: 'border-step5', bg: 'bg-step5/10', text: 'text-step5' },
  step6: { border: 'border-step6', bg: 'bg-step6/10', text: 'text-step6' },
  step7: { border: 'border-step7', bg: 'bg-step7/10', text: 'text-step7' },
}

export default function ChoiceCard({ label, selected, onClick, accent = 'step1', icon: Icon }) {
  const cls = ACCENT_CLASSES[accent] || ACCENT_CLASSES.step1
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all w-32 h-28
        ${selected ? `${cls.border} ${cls.bg} shadow-md scale-105` : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      {Icon && <Icon className={`text-2xl ${selected ? cls.text : 'text-slate-500'}`} />}
      <span className={`text-sm font-medium text-center ${selected ? cls.text : 'text-slate-700'}`}>{label}</span>
    </button>
  )
}
