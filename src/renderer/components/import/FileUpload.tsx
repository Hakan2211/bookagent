import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { IPC } from '@shared/ipc-channels'
import { Upload } from 'lucide-react'

interface FileUploadProps {
  onFileSelected: (path: string) => void
}

export function FileUpload({ onFileSelected }: FileUploadProps) {
  const { t } = useTranslation('import')
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
    if ((file as any)?.path) {
      onFileSelected((file as any).path)
    }
  }

  return (
    <div className="py-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-14 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-[var(--border-active)] bg-[var(--bg-hover)] shadow-[var(--shadow-glow)]'
            : 'border-[var(--border)] hover:border-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
        }`}
        onClick={handleBrowse}
      >
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-active)] flex items-center justify-center mx-auto mb-4">
          <Upload size={24} className="text-[var(--text-accent)]" />
        </div>
        <p className="text-sm text-[var(--text-primary)] mb-1 font-medium">
          {t('import:dropFileHere')}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {t('import:fileTypes')}
        </p>
      </div>

      <div className="text-center mt-4">
        <button
          onClick={handleBrowse}
          className="text-sm text-[var(--text-accent)] hover:text-[var(--text-accent-hover)] font-medium transition-colors"
        >
          {t('import:browseFiles')}
        </button>
      </div>
    </div>
  )
}
