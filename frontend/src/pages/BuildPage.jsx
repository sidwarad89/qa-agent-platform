import React, { useState } from 'react'
import {
  FiCpu, FiCode, FiLayers, FiGrid, FiPaperclip, FiPlayCircle, FiShare2,
} from 'react-icons/fi'
import { useAgentConfig } from '../context/AgentConfigContext'
import { validateModelToken, buildAgent, recordAgentBuilt } from '../api/client'

import { AI_MODELS, getProvider } from '../data/aiModels'
import { LANGUAGES } from '../data/languages'
import { FRAMEWORKS, getFramework } from '../data/frameworks'

import SectionCard from '../components/shared/SectionCard'
import ChoiceCard from '../components/shared/ChoiceCard'
import CredentialInput from '../components/shared/CredentialInput'
import ValidationBadge from '../components/shared/ValidationBadge'
import ApiKeyHelp from '../components/shared/ApiKeyHelp'
import FrameworkPreview from '../components/shared/FrameworkPreview'
import FileManager from '../components/shared/FileManager'
import ProgressOverview from '../components/shared/ProgressOverview'
import ExecutionLog from '../components/shared/ExecutionLog'

const PLACEHOLDER = `e.g. "Pull user story QA-12 from Jira (connected under MCP Tools), generate 10-20 test scenarios and attach them back to that story as a subtask. Then generate 5-10 test cases covering positive, negative, and security testing techniques, upload them to TestRail section 8, then generate executable automation scripts using the selected framework."`

export default function BuildPage({ onNavigate }) {
  const { config, updateConfig, clearDraft } = useAgentConfig()

  const provider = getProvider(config.ai_provider)
  const selectedVersion = provider?.versions.find((v) => v.id === config.ai_model_version)
  const framework = getFramework(config.framework)

  // --- AI Engine ---
  const [aiStatus, setAiStatus] = useState('idle')
  const [aiMessage, setAiMessage] = useState('')
  const handleValidateAi = async () => {
    setAiStatus('loading')
    try {
      const result = await validateModelToken({
        provider: config.ai_provider,
        model_version: config.ai_model_version,
        api_key: config.ai_api_key,
      })
      setAiStatus(result.valid ? 'success' : 'error')
      setAiMessage(result.message)
      updateConfig({ ai_validated: result.valid })
    } catch {
      setAiStatus('error')
      setAiMessage('Could not reach backend — is it running?')
    }
  }

  // --- Build agent ---
  const [events, setEvents] = useState([])
  const [running, setRunning] = useState(false)

  const progressItems = [
    { label: 'Agent Name', done: !!config.agentName.trim() },
    { label: 'AI Engine', done: !!config.ai_validated },
    { label: 'Language', done: !!config.language },
    { label: 'Framework', done: !!config.framework },
    { label: 'Layout', done: !!config.framework_layout },
    { label: 'Workflow', done: !!config.workflow_prompt },
  ]
  const allReady = progressItems.every((i) => i.done)

  const handleBuild = async () => {
    setEvents([])
    setRunning(true)

    try {
      await recordAgentBuilt({
        name: config.agentName.trim() || 'Untitled Agent',
        ai_provider: config.ai_provider,
        ai_model_version: config.ai_model_version,
        framework: config.framework,
        workflow_prompt: config.workflow_prompt,
      })
    } catch {
      // non-critical — profile stat just won't increment if this fails
    }

    const payload = {
      ai_provider: config.ai_provider,
      ai_model_version: config.ai_model_version,
      ai_api_key: config.ai_api_key,
      language: config.language,
      framework: config.framework,
      framework_layout: config.framework_layout,
      custom_framework_details: config.custom_framework_details,
      custom_framework_files: (config.custom_framework_files || []).map((f) => ({
        name: f.name, size: f.size, ext: f.ext, content: f.isTextEditable ? f.content : null,
      })),
      custom_layout_details: config.custom_layout_details,
      workflow_prompt: config.workflow_prompt,
    }
    buildAgent(
      payload,
      (event) => setEvents((prev) => [...prev, event]),
      () => { setRunning(false); clearDraft() },
      () => setRunning(false),
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-slate-800">Build an Agent</h1>
        <p className="text-slate-500 text-sm max-w-2xl">
          Configure engine, language, and framework, then describe the workflow. Need to read from or write to
          Jira, GitHub, TestRail, and similar tools? Connect them once under{' '}
          <button onClick={() => onNavigate?.('mcp')} className="text-indigo-600 font-medium inline-flex items-center gap-1">
            <FiShare2 size={14} /> MCP Tools
          </button>{' '}
          and just mention the action in your workflow prompt below.
        </p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-600">Agent Name</label>
        <input
          className="border border-slate-300 rounded-lg px-3 py-2 w-full sm:w-96"
          placeholder="e.g. Test Scenario Generator Agent"
          value={config.agentName}
          onChange={(e) => updateConfig({ agentName: e.target.value })}
        />
        <p className="text-xs text-slate-400">Give it a clear name — this is how you'll pick it later when chaining agents in an Agentic Process.</p>
      </div>

      <ProgressOverview items={progressItems} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. AI Engine */}
        <SectionCard index={1} title="Choose AI Engine" subtitle="Model provider, version, and API token" accent="#8b5cf6" icon={FiCpu} done={!!config.ai_validated}>
          <div className="flex flex-col gap-4">
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 w-full"
              value={config.ai_provider}
              onChange={(e) => updateConfig({ ai_provider: e.target.value, ai_model_version: '', ai_validated: false })}
            >
              <option value="">Select an AI engine...</option>
              {AI_MODELS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>

            {provider && (
              <div className="flex flex-col gap-2">
                <select
                  className="border border-slate-300 rounded-lg px-3 py-2 w-full sm:w-80"
                  value={config.ai_model_version}
                  onChange={(e) => updateConfig({ ai_model_version: e.target.value, ai_validated: false })}
                >
                  <option value="">Select model version</option>
                  {provider.versions.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}{v.free ? ' — Free tier available' : ''}</option>
                  ))}
                </select>

                {selectedVersion && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {selectedVersion.free && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Free tier</span>
                    )}
                    {selectedVersion.bestFor.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {provider && config.ai_model_version && (
              <div className="flex flex-col gap-3">
                <ApiKeyHelp
                  steps={provider.steps}
                  consoleUrl={provider.consoleUrl}
                  keyFormatHint={provider.keyFormatHint}
                  label={`Don't know the ${provider.label} API token? How to get one?`}
                />
                <CredentialInput
                  label="API Token"
                  value={config.ai_api_key}
                  onChange={(v) => updateConfig({ ai_api_key: v, ai_validated: false })}
                  placeholder={provider.keyFormatHint}
                />
                <div>
                  <button
                    onClick={handleValidateAi}
                    disabled={!config.ai_api_key}
                    className="px-4 py-2 bg-step1 text-white rounded-lg text-sm font-medium disabled:opacity-40"
                  >
                    Validate Token
                  </button>
                  <ValidationBadge status={aiStatus} message={aiMessage} />
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* 2. Language */}
        <SectionCard index={2} title="Choose Coding Language" subtitle="Language your automation scripts will be generated in" accent="#f59e0b" icon={FiCode} done={!!config.language}>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 w-full"
            value={config.language}
            onChange={(e) => updateConfig({ language: e.target.value })}
          >
            <option value="">Select a language...</option>
            {LANGUAGES.map((l) => <option key={l.id} value={l.label}>{l.label}</option>)}
          </select>
        </SectionCard>

        {/* 3. Framework */}
        <SectionCard index={3} title="Choose Testing Framework" subtitle="See a live sample the moment you pick one" accent="#ec4899" icon={FiLayers} done={!!config.framework}>
          <div className="flex flex-col gap-4">
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 w-full"
              value={config.framework}
              onChange={(e) => updateConfig({ framework: e.target.value, framework_layout: '' })}
            >
              <option value="">Select a framework...</option>
              {FRAMEWORKS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            {framework?.desc && <p className="text-sm text-slate-500">{framework.desc}</p>}
            <FrameworkPreview framework={framework} />
          </div>
        </SectionCard>

        {/* 4. Layout */}
        <SectionCard index={4} title="Choose Framework Layout" subtitle="Folder / pattern convention for generated code" accent="#06b6d4" icon={FiGrid} done={!!config.framework_layout}>
          {!config.framework && <p className="text-sm text-slate-500">Pick a framework first.</p>}
          <div className="flex gap-3 flex-wrap">
            {(framework?.layouts || []).map((l) => (
              <div key={l.id} className="w-56">
                <ChoiceCard
                  label={l.label} accent="step6"
                  selected={config.framework_layout === l.id}
                  onClick={() => updateConfig({ framework_layout: l.id })}
                />
                <p className="text-xs text-slate-500 mt-1">{l.desc}</p>
              </div>
            ))}
            {config.framework && (
              <ChoiceCard
                label="Customize" accent="step6"
                selected={config.framework_layout === 'custom'}
                onClick={() => updateConfig({ framework_layout: 'custom' })}
              />
            )}
          </div>
          {config.framework_layout === 'custom' && (
            <textarea
              className="border border-slate-300 rounded-lg px-3 py-2 w-full h-28 mt-3"
              placeholder="Describe or paste your own folder structure / layout conventions..."
              value={config.custom_layout_details}
              onChange={(e) => updateConfig({ custom_layout_details: e.target.value })}
            />
          )}
        </SectionCard>
      </div>

      {config.framework === 'Customize' && (
        <SectionCard index={5} title="Customize Framework Reference Files" subtitle="Upload docs, PDFs, spreadsheets, or plain text describing your framework — edit, remove, or re-upload anytime" accent="#ec4899" icon={FiPaperclip}>
          <FileManager
            files={config.custom_framework_files}
            onFilesChange={(files) => updateConfig({ custom_framework_files: files })}
            text={config.custom_framework_details}
            onTextChange={(t) => updateConfig({ custom_framework_details: t })}
          />
        </SectionCard>
      )}

      <SectionCard index={6} title="Describe the Workflow & Build" subtitle="Tell the agent what to do end-to-end, then generate it" accent="#ef4444" icon={FiPlayCircle}>
        <div className="flex flex-col gap-4">
          <textarea
            className="border border-slate-300 rounded-lg px-3 py-2 w-full h-36"
            placeholder={PLACEHOLDER}
            value={config.workflow_prompt}
            onChange={(e) => updateConfig({ workflow_prompt: e.target.value })}
          />

          {!allReady && (
            <p className="text-sm text-amber-600">
              Complete all sections above (validated AI token, language, framework + layout, workflow prompt) before building.
            </p>
          )}

          <button
            onClick={handleBuild}
            disabled={!allReady || running}
            className="self-start px-6 py-3 bg-step7 text-white rounded-lg font-semibold disabled:opacity-40"
          >
            {running ? 'Building Agent...' : 'Build Agent'}
          </button>

          <ExecutionLog events={events} />
        </div>
      </SectionCard>
    </div>
  )
}
