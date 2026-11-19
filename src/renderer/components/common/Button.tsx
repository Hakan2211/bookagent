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
      'bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)] active:scale-[0.98]',
    secondary:
      'bg-transparent text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:border-[var(--text-tertiary)] active:scale-[0.98]',
    ghost:
      'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.98]',
    danger:
      'bg-transparent text-[var(--color-error)] border border-[var(--color-error)]/40 hover:bg-[var(--color-error)]/10 active:scale-[0.98]'
  }

  // md/lg buttons speak in the book serif, like the mockups; sm stays UI-sans.
  const sizes = {
    sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-[var(--radius-sm)]',
    md: 'h-10 px-5 text-[15px] gap-2 rounded-[var(--radius-md)] font-serif font-normal',
    lg: 'h-11 px-7 text-[16px] gap-2.5 rounded-[var(--radius-md)] font-serif font-normal'
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
