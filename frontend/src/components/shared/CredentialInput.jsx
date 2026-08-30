import React, { useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'

export default function CredentialInput({ label, value, onChange, placeholder = '', mask = true }) {
  const [show, setShow] = useState(!mask)
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <div className="relative">
        <input
          type={mask && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 pr-10"
        />
        {mask && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            {show ? <FiEyeOff /> : <FiEye />}
          </button>
        )}
      </div>
    </div>
  )
}
