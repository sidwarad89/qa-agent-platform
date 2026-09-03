import React, { createContext, useContext, useEffect, useState } from 'react'
import { scopedKey } from '../utils/scopedStorage'

const AgentConfigContext = createContext(null)

const initialConfig = {
  agentName: '',
  ai_provider: '', ai_model_version: '', ai_api_key: '', ai_validated: false,
  language: '',
  input_tool: '', input_credentials: {}, input_validated: false,
  output_tool: '', output_credentials: {}, output_validated: false,
  framework: '', custom_framework_details: '',
  custom_framework_files: [],
  framework_layout: '', custom_layout_details: '',
  workflow_prompt: '',
}

function loadDraft() {
  try {
    const saved = localStorage.getItem(scopedKey('qa_agent_build_draft'))
    if (!saved) return initialConfig
    // API keys are intentionally never persisted, even in a draft - re-enter after refresh.
    return { ...initialConfig, ...JSON.parse(saved), ai_api_key: '', ai_validated: false }
  } catch {
    return initialConfig
  }
}

export function AgentConfigProvider({ children }) {
  const [config, setConfig] = useState(loadDraft)

  useEffect(() => {
    const { ai_api_key, ...toSave } = config
    localStorage.setItem(scopedKey('qa_agent_build_draft'), JSON.stringify(toSave))
  }, [config])

  const updateConfig = (patch) => setConfig((prev) => ({ ...prev, ...patch }))

  const clearDraft = () => {
    localStorage.removeItem(scopedKey('qa_agent_build_draft'))
    setConfig(initialConfig)
  }

  return (
    <AgentConfigContext.Provider value={{ config, updateConfig, clearDraft }}>
      {children}
    </AgentConfigContext.Provider>
  )
}

export function useAgentConfig() {
  const ctx = useContext(AgentConfigContext)
  if (!ctx) throw new Error('useAgentConfig must be used within AgentConfigProvider')
  return ctx
}
