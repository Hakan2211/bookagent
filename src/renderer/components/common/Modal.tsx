import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
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
    full: 'max-w-[90vw] max-h-[90vh]'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: 'fade-in 200ms ease-out' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={`relative ${sizeClasses[size]} w-full mx-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden`}
        style={{
          animation: 'scale-in 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: 'var(--elevation-4)'
        }}
      >
        {title && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-2 rounded-xl hover:bg-[var(--bg-hover)]"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  )
}
