import React, { useState } from 'react'
import CredentialInput from './CredentialInput'
import ValidationBadge from './ValidationBadge'
import ApiKeyHelp from './ApiKeyHelp'

export default function CredentialForm({ tool, credentials, onCredChange, onValidate, accentClass = 'bg-step3' }) {
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  if (!tool) return null

  const handleValidate = async () => {
    setStatus('loading')
    try {
      const result = await onValidate()
      setStatus(result.valid ? 'success' : 'error')
      setMessage(result.message)
    } catch {
      setStatus('error')
      setMessage('Could not reach backend.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ApiKeyHelp steps={tool.steps} label={`Don't know the ${tool.label} API token / key? How to get one?`} />
      {tool.fields.map((f) => (
        <CredentialInput
          key={f.key}
          label={f.label}
          mask={f.mask}
          placeholder={f.placeholder}
          value={credentials[f.key] || ''}
          onChange={(v) => onCredChange(f.key, v)}
        />
      ))}
      <div>
        <button onClick={handleValidate} className={`px-4 py-2 ${accentClass} text-white rounded-lg text-sm font-medium`}>
          Validate Credentials
        </button>
        <ValidationBadge status={status} message={message} />
      </div>
    </div>
  )
}
