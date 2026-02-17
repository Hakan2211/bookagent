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
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:opacity-40 disabled:pointer-events-none select-none'

  const variants = {
    primary:
      'bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-400 text-white shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_12px_rgba(129,140,248,0.15)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.3),0_0_20px_rgba(129,140,248,0.25)] hover:brightness-110 active:brightness-95 active:scale-[0.98]',
    secondary:
      'bg-[var(--bg-input)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] hover:border-[var(--border-active)] shadow-[var(--shadow-xs)] active:scale-[0.98]',
    ghost:
      'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.98]',
    danger:
      'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 active:scale-[0.98]'
  }

  const sizes = {
    sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
    md: 'h-9 px-4 text-sm gap-2 rounded-lg',
    lg: 'h-11 px-6 text-sm gap-2.5 rounded-lg font-semibold'
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
