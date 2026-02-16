import React, { useState, useRef } from 'react'
import { IPC } from '@shared/ipc-channels'

interface FileUploadProps {
  onFileSelected: (path: string) => void
}

export function FileUpload({ onFileSelected }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleBrowse = async () => {
    const path = (await window.api.invoke(IPC.DIALOG_OPEN_FILE)) as string | null
    if (path) onFileSelected(path)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.path) {
      onFileSelected(file.path)
    }
  }

  return (
    <div className="py-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          isDragOver
            ? 'border-[var(--border-active)] bg-[var(--bg-hover)]'
            : 'border-[var(--border)] hover:border-[var(--text-secondary)]'
        }`}
        onClick={handleBrowse}
      >
        <div className="text-4xl mb-3 opacity-30">&#128196;</div>
        <p className="text-sm text-[var(--text-primary)] mb-1">
          Drop your file here
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          PDF, DOCX, TXT, or MD
        </p>
      </div>

      <div className="text-center mt-3">
        <button
          onClick={handleBrowse}
          className="text-sm text-[var(--text-accent)] hover:underline"
        >
          Browse files
        </button>
      </div>
    </div>
  )
}
