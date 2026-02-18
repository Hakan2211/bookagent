import React from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:opacity-50 disabled:pointer-events-none select-none'

  const variants = {
    primary:
      'bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-primary)] to-[var(--accent-secondary)] text-[var(--text-on-accent)] shadow-[var(--elevation-1)] hover:shadow-[var(--shadow-glow)] hover:brightness-110 active:brightness-95 active:scale-[0.98]',
    secondary:
      'bg-[var(--bg-input)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] hover:border-[var(--border-active)] shadow-[var(--shadow-xs)] hover:shadow-[var(--elevation-1)] active:scale-[0.98]',
    ghost:
      'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.98]',
    danger:
      'bg-[var(--color-error)]/10 text-[var(--color-error)] hover:bg-[var(--color-error)]/20 border border-[var(--color-error)]/30 hover:border-[var(--color-error)]/50 active:scale-[0.98]'
  }

  const sizes = {
    sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-lg',
    md: 'h-10 px-5 text-[14px] gap-2 rounded-xl',
    lg: 'h-12 px-7 text-[15px] gap-2.5 rounded-xl font-semibold'
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}
