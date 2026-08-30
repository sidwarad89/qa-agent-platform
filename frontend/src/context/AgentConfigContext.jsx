import React, { createContext, useContext, useState } from 'react'

const AgentConfigContext = createContext(null)

const initialConfig = {
  ai_provider: '', ai_model_version: '', ai_api_key: '', ai_validated: false,
  language: '',
  input_tool: '', input_credentials: {}, input_validated: false,
  output_tool: '', output_credentials: {}, output_validated: false,
  framework: '', custom_framework_details: '',
  custom_framework_files: [],
  framework_layout: '', custom_layout_details: '',
  workflow_prompt: '',
}

export function AgentConfigProvider({ children }) {
  const [config, setConfig] = useState(initialConfig)
  const updateConfig = (patch) => setConfig((prev) => ({ ...prev, ...patch }))
  return (
    <AgentConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </AgentConfigContext.Provider>
  )
}

export function useAgentConfig() {
  const ctx = useContext(AgentConfigContext)
  if (!ctx) throw new Error('useAgentConfig must be used within AgentConfigProvider')
  return ctx
}
