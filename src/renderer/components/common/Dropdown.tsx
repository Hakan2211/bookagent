import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface DropdownOption {
  value: string
  label: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = ''
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => o.value === value)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-[14px] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] hover:border-[var(--border-active)] transition-all shadow-[var(--shadow-xs)] focus-visible:shadow-[0_0_0_2px_var(--focus-ring-soft)]"
      >
        <span className={selectedOption ? '' : 'text-[var(--text-tertiary)]'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`text-[var(--text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl overflow-hidden py-1.5"
          style={{
            animation: 'slide-up 150ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: 'var(--elevation-3)'
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-3 text-[14px] flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors ${
                option.value === value
                  ? 'text-[var(--text-accent)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {option.label}
              {option.value === value && (
                <Check size={14} className="text-[var(--text-accent)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
