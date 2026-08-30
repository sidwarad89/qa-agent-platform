import React, { useRef, useState } from 'react'
import { FiUpload, FiTrash2, FiRefreshCw, FiEdit2, FiFile, FiFileText, FiCheck, FiX } from 'react-icons/fi'

const TEXT_EXTENSIONS = ['txt', 'csv', 'json', 'md', 'yml', 'yaml']

function extOf(name = '') {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

function formatSize(bytes) {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve('')
    reader.readAsText(file)
  })
}

export default function FileManager({ files, onFilesChange, text, onTextChange }) {
  const fileInputRef = useRef(null)
  const replaceInputRef = useRef(null)
  const [replaceTargetId, setReplaceTargetId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [draftContent, setDraftContent] = useState('')

  const buildEntry = async (file) => {
    const ext = extOf(file.name)
    const isTextEditable = TEXT_EXTENSIONS.includes(ext)
    const content = isTextEditable ? await readAsText(file) : null
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `${file.name}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      ext,
      isTextEditable,
      content,
    }
  }

  const handleAdd = async (fileList) => {
    const incoming = Array.from(fileList || [])
    if (incoming.length === 0) return
    const entries = await Promise.all(incoming.map(buildEntry))
    onFilesChange([...files, ...entries])
  }

  const handleReplace = async (fileList) => {
    const file = fileList?.[0]
    if (!file || !replaceTargetId) return
    const entry = await buildEntry(file)
    onFilesChange(files.map((f) => (f.id === replaceTargetId ? { ...entry, id: f.id } : f)))
    setReplaceTargetId(null)
  }

  const removeFile = (id) => onFilesChange(files.filter((f) => f.id !== id))

  const startEdit = (f) => {
    setEditingId(f.id)
    setDraftContent(f.content ?? '')
  }

  const saveEdit = (id) => {
    onFilesChange(files.map((f) => (f.id === id ? { ...f, content: draftContent, size: draftContent.length } : f)))
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleAdd(e.dataTransfer.files) }}
        className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center hover:border-step5 transition-colors cursor-pointer bg-slate-50/60"
        onClick={() => fileInputRef.current?.click()}
      >
        <FiUpload className="text-2xl text-slate-400" />
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-step5">Click to upload</span> or drag & drop
        </p>
        <p className="text-xs text-slate-400">Word, PDF, Excel, CSV, TXT, JSON — any reference docs for your custom framework</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".doc,.docx,.pdf,.xls,.xlsx,.csv,.txt,.json,.md,.yml,.yaml"
          className="hidden"
          onChange={(e) => { handleAdd(e.target.files); e.target.value = '' }}
        />
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept=".doc,.docx,.pdf,.xls,.xlsx,.csv,.txt,.json,.md,.yml,.yaml"
        className="hidden"
        onChange={(e) => { handleReplace(e.target.files); e.target.value = '' }}
      />

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <div key={f.id} className="border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3 px-3 py-2">
                {f.isTextEditable ? <FiFileText className="text-step5 shrink-0" /> : <FiFile className="text-slate-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(f.size)} · {f.ext.toUpperCase() || 'FILE'}</p>
                </div>
                {f.isTextEditable && editingId !== f.id && (
                  <button type="button" onClick={() => startEdit(f)} className="text-slate-400 hover:text-step5 p-1.5" title="Edit content">
                    <FiEdit2 />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setReplaceTargetId(f.id); replaceInputRef.current?.click() }}
                  className="text-slate-400 hover:text-blue-600 p-1.5"
                  title="Wrong file? Delete & re-upload"
                >
                  <FiRefreshCw />
                </button>
                <button type="button" onClick={() => removeFile(f.id)} className="text-slate-400 hover:text-red-600 p-1.5" title="Remove">
                  <FiTrash2 />
                </button>
              </div>
              {editingId === f.id && (
                <div className="border-t border-slate-200 p-3 flex flex-col gap-2">
                  <textarea
                    className="border border-slate-300 rounded-lg px-3 py-2 w-full h-32 font-mono text-xs"
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                  />
                  <div className="flex gap-2 self-end">
                    <button type="button" onClick={() => setEditingId(null)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600">
                      <FiX /> Cancel
                    </button>
                    <button type="button" onClick={() => saveEdit(f.id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-step5 text-white">
                      <FiCheck /> Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-600">Or just describe it in plain text</label>
        <textarea
          className="border border-slate-300 rounded-lg px-3 py-2 w-full h-24"
          placeholder="Paste or type your custom framework conventions, naming rules, or anything else the agent should follow..."
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
        />
      </div>
    </div>
  )
}
