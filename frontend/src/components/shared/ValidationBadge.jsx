import React from 'react'
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi'

export default function ValidationBadge({ status, message }) {
  if (status === 'idle') return null
  const config = {
    loading: { icon: <FiLoader className="animate-spin" />, color: 'text-slate-500' },
    success: { icon: <FiCheckCircle />, color: 'text-green-600' },
    error: { icon: <FiXCircle />, color: 'text-red-600' },
  }[status]
  return (
    <div className={`flex items-center gap-2 text-sm mt-1 ${config.color}`}>
      {config.icon}
      <span>{message}</span>
    </div>
  )
}
