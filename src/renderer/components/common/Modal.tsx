import React, { useEffect } from 'react'
import { X, Feather } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'wide' | 'full'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-4xl',
    wide: 'max-w-[1120px]',
    full: 'max-w-[90vw] max-h-[90vh]'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: 'fade-in 200ms ease-out' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={`relative ${sizeClasses[size]} w-full mx-4 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] overflow-hidden`}
        style={{
          animation: 'scale-in 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: 'var(--elevation-4)'
        }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <h2 className="flex items-center gap-2.5 font-serif text-[24px] text-[var(--text-primary)]">
              <Feather size={18} strokeWidth={1.5} className="text-[var(--accent-primary)]" />
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)]"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto max-h-[84vh]">
          {children}
        </div>
      </div>
    </div>
  )
}
