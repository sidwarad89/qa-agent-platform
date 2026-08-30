import React, { useState } from 'react'
import {
  FiCpu, FiCode, FiDownloadCloud, FiUploadCloud, FiLayers, FiGrid,
  FiPaperclip, FiPlayCircle,
} from 'react-icons/fi'
import { useAgentConfig } from '../context/AgentConfigContext'
import { validateModelToken, validateInputTool, validateOutputTool, buildAgent } from '../api/client'

import { PROVIDERS, getProvider } from '../data/aiProviders'
import { LANGUAGES } from '../data/languages'
import { INPUT_TOOLS, OUTPUT_TOOLS, getToolDef } from '../data/tools'
import { FRAMEWORKS, getFramework } from '../data/frameworks'

import SectionCard from './shared/SectionCard'
import ChoiceCard from './shared/ChoiceCard'
import CredentialInput from './shared/CredentialInput'
import ValidationBadge from './shared/ValidationBadge'
import ApiKeyHelp from './shared/ApiKeyHelp'
import CredentialForm from './shared/CredentialForm'
import FrameworkPreview from './shared/FrameworkPreview'
import FileManager from './shared/FileManager'
import ProgressOverview from './shared/ProgressOverview'
import ExecutionLog from './shared/ExecutionLog'

const PLACEHOLDER = `e.g. "Take input as user story ID (Jira ID), generate 10-20 test scenarios and attach them back to the same Jira story as a subtask. Then take those scenarios, generate 5-10 test cases covering positive, negative, and security testing techniques, upload those test cases to TestRail under the provided section ID, then generate executable automation scripts using the selected framework."`

export default function Dashboard() {
  const { config, updateConfig } = useAgentConfig()

  const provider = getProvider(config.ai_provider)
  const inputToolDef = getToolDef(INPUT_TOOLS, config.input_tool)
  const outputToolDef = getToolDef(OUTPUT_TOOLS, config.output_tool)
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
      setAiMessage('Could not reach backend — is it running on localhost:8000?')
    }
  }

  // --- Input tool ---
  const setInputCred = (key, value) =>
    updateConfig({ input_credentials: { ...config.input_credentials, [key]: value }, input_validated: false })
  const validateInput = async () => {
    const creds = config.input_credentials
    const result = await validateInputTool({
      tool: config.input_tool, username: creds.username, api_key: creds.api_key,
      base_url: creds.base_url, extra: { organization: creds.organization, project: creds.project },
    })
    updateConfig({ input_validated: result.valid })
    return result
  }

  // --- Output tool ---
  const setOutputCred = (key, value) =>
    updateConfig({ output_credentials: { ...config.output_credentials, [key]: value }, output_validated: false })
  const validateOutput = async () => {
    const creds = config.output_credentials
    const result = await validateOutputTool({
      tool: config.output_tool, username: creds.username, api_key: creds.api_key,
      base_url: creds.base_url, extra: { organization: creds.organization, project: creds.project, repo: creds.repo },
    })
    updateConfig({ output_validated: result.valid })
    return result
  }

  // --- Build agent ---
  const [events, setEvents] = useState([])
  const [running, setRunning] = useState(false)

  const progressItems = [
    { label: 'AI Engine', done: !!config.ai_validated },
    { label: 'Language', done: !!config.language },
    { label: 'Data Source', done: !!config.input_validated },
    { label: 'Destination', done: !!config.output_validated },
    { label: 'Framework', done: !!config.framework },
    { label: 'Layout', done: !!config.framework_layout },
    { label: 'Workflow', done: !!config.workflow_prompt },
  ]
  const allReady = progressItems.every((i) => i.done)

  const handleBuild = () => {
    setEvents([])
    setRunning(true)
    const payload = {
      ai_provider: config.ai_provider,
      ai_model_version: config.ai_model_version,
      ai_api_key: config.ai_api_key,
      language: config.language,
      input_tool: config.input_tool,
      input_credentials: config.input_credentials,
      output_tool: config.output_tool,
      output_credentials: config.output_credentials,
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
      () => setRunning(false),
      () => setRunning(false),
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 flex flex-col gap-6">
      <header className="text-center flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-step1 via-step5 to-step7 bg-clip-text text-transparent">
          QA Agent Builder
        </h1>
        <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">
          Configure every part of your AI QA agent on one screen — engine, language, data sources, framework, and destination — then generate it.
        </p>
      </header>

      <ProgressOverview items={progressItems} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. AI Engine */}
        <SectionCard index={1} title="Choose AI Engine" subtitle="Model provider, version, and API token" accent="#8b5cf6" icon={FiCpu} done={!!config.ai_validated}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 flex-wrap">
              {PROVIDERS.map((p) => (
                <ChoiceCard
                  key={p.id} label={p.label} accent="step1"
                  selected={config.ai_provider === p.id}
                  onClick={() => updateConfig({ ai_provider: p.id, ai_model_version: '', ai_validated: false })}
                />
              ))}
            </div>

            {provider && (
              <select
                className="border border-slate-300 rounded-lg px-3 py-2 w-full sm:w-72"
                value={config.ai_model_version}
                onChange={(e) => updateConfig({ ai_model_version: e.target.value, ai_validated: false })}
              >
                <option value="">Select model version</option>
                {provider.versions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
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
          <div className="flex gap-3 flex-wrap">
            {LANGUAGES.map((l) => (
              <ChoiceCard
                key={l.id} label={l.label} accent="step2"
                selected={config.language === l.label}
                onClick={() => updateConfig({ language: l.label })}
              />
            ))}
          </div>
        </SectionCard>

        {/* 3. Input source */}
        <SectionCard index={3} title="From where do you want to get the data?" subtitle="Pull requirements / stories from a PM tool" accent="#3b82f6" icon={FiDownloadCloud} done={!!config.input_validated}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 flex-wrap">
              {INPUT_TOOLS.map((t) => (
                <ChoiceCard
                  key={t.id} label={t.label} accent="step3"
                  selected={config.input_tool === t.id}
                  onClick={() => updateConfig({ input_tool: t.id, input_credentials: {}, input_validated: false })}
                />
              ))}
            </div>
            {inputToolDef && (
              <CredentialForm
                tool={inputToolDef}
                credentials={config.input_credentials}
                onCredChange={setInputCred}
                onValidate={validateInput}
                accentClass="bg-step3"
              />
            )}
          </div>
        </SectionCard>

        {/* 4. Output tool */}
        <SectionCard index={4} title="Where do you want to upload the generated data?" subtitle="Push generated test cases / scripts to a tool or repo" accent="#10b981" icon={FiUploadCloud} done={!!config.output_validated}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 flex-wrap">
              {OUTPUT_TOOLS.map((t) => (
                <ChoiceCard
                  key={t.id} label={t.label} accent="step4"
                  selected={config.output_tool === t.id}
                  onClick={() => updateConfig({ output_tool: t.id, output_credentials: {}, output_validated: false })}
                />
              ))}
            </div>
            {outputToolDef && (
              <CredentialForm
                tool={outputToolDef}
                credentials={config.output_credentials}
                onCredChange={setOutputCred}
                onValidate={validateOutput}
                accentClass="bg-step4"
              />
            )}
          </div>
        </SectionCard>

        {/* 5. Framework */}
        <SectionCard index={5} title="Choose Testing Framework" subtitle="See a live sample the moment you pick one" accent="#ec4899" icon={FiLayers} done={!!config.framework}>
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500 -mt-1">
              Note: Jenkins is a CI/CD orchestrator, not a test framework — it runs alongside whichever
              framework you pick rather than being one itself. Mention it in your workflow prompt if you want it wired in.
            </p>
            <div className="flex gap-3 flex-wrap">
              {FRAMEWORKS.map((f) => (
                <ChoiceCard
                  key={f.id} label={f.label} accent="step5"
                  selected={config.framework === f.id}
                  onClick={() => updateConfig({ framework: f.id, framework_layout: '' })}
                />
              ))}
            </div>
            {framework?.desc && <p className="text-sm text-slate-500">{framework.desc}</p>}
            <FrameworkPreview framework={framework} />
          </div>
        </SectionCard>

        {/* 6. Layout */}
        <SectionCard index={6} title="Choose Framework Layout" subtitle="Folder / pattern convention for generated code" accent="#06b6d4" icon={FiGrid} done={!!config.framework_layout}>
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

      {/* Customize files — full width, only relevant when framework is custom */}
      {config.framework === 'Customize' && (
        <SectionCard index={7} title="Customize Framework Reference Files" subtitle="Upload docs, PDFs, spreadsheets, or plain text describing your framework — edit, remove, or re-upload anytime" accent="#ec4899" icon={FiPaperclip}>
          <FileManager
            files={config.custom_framework_files}
            onFilesChange={(files) => updateConfig({ custom_framework_files: files })}
            text={config.custom_framework_details}
            onTextChange={(t) => updateConfig({ custom_framework_details: t })}
          />
        </SectionCard>
      )}

      {/* Build */}
      <SectionCard index={8} title="Describe the Workflow & Build" subtitle="Tell the agent what to do end-to-end, then generate it" accent="#ef4444" icon={FiPlayCircle}>
        <div className="flex flex-col gap-4">
          <textarea
            className="border border-slate-300 rounded-lg px-3 py-2 w-full h-36"
            placeholder={PLACEHOLDER}
            value={config.workflow_prompt}
            onChange={(e) => updateConfig({ workflow_prompt: e.target.value })}
          />

          {!allReady && (
            <p className="text-sm text-amber-600">
              Complete all sections above (validated AI token, language, validated data source & destination, framework + layout, workflow prompt) before building.
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
