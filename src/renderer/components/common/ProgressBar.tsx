import React from 'react'

interface ProgressBarProps {
  value: number // 0-100
  max?: number
  label?: string
  showPercentage?: boolean
  className?: string
  color?: 'accent' | 'green' | 'yellow'
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  className = '',
  color = 'accent'
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const barStyles = {
    accent: 'bg-[var(--accent-primary)]',
    green: 'bg-[var(--status-final)]',
    yellow: 'bg-[var(--status-draft)]'
  }

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1.5 font-medium">
          {label && <span>{label}</span>}
          {showPercentage && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="w-full h-1.5 bg-[var(--bg-active)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barStyles[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
