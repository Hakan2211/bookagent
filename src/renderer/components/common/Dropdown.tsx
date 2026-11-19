import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  const updateMenuPosition = useCallback(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const menuHeight = Math.min(options.length * 44 + 12, 320)
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow

    if (openUp) {
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top + 4,
        maxHeight: Math.min(rect.top - 8, 320),
        zIndex: 9999
      })
    } else {
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        top: rect.bottom + 4,
        maxHeight: Math.min(spaceBelow - 8, 320),
        zIndex: 9999
      })
    }
  }, [options.length])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      updateMenuPosition()
      window.addEventListener('scroll', updateMenuPosition, true)
      window.addEventListener('resize', updateMenuPosition)
    }
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true)
      window.removeEventListener('resize', updateMenuPosition)
    }
  }, [isOpen, updateMenuPosition])

  const selectedOption = options.find((o) => o.value === value)

  const menu = isOpen
    ? ReactDOM.createPortal(
        <div
          className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-[var(--radius-md)] overflow-y-auto py-1 shadow-[var(--shadow-md)]"
          style={{
            ...menuStyle,
            animation: 'slide-up 150ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: 'var(--elevation-3)'
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-2 font-serif text-[14.5px] flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors ${
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
        </div>,
        document.body
      )
    : null

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 flex items-center justify-between gap-2 px-3 font-serif text-[14.5px] bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[var(--radius-md)] text-[var(--text-primary)] hover:border-[var(--text-tertiary)] focus-visible:border-[var(--border-active)] outline-none"
      >
        <span className={`truncate ${selectedOption ? '' : 'text-[var(--text-tertiary)]'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`text-[var(--text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {menu}
    </div>
  )
}
