import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'outline' | 'filled'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      size = 'md',
      variant = 'outline',
      leftIcon,
      rightIcon,
      loading = false,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-10 px-3 text-sm',
      lg: 'h-11 px-4 text-base',
    }

    const variantClasses = {
      outline:
        'border border-[var(--bready-border)] bg-[var(--bready-surface)] focus:outline-none focus:border-[var(--bready-accent)] focus:shadow-[0_0_0_2px_var(--bready-accent)]',
      filled:
        'border border-transparent bg-[var(--bready-surface-2)] focus:bg-[var(--bready-surface)] focus:outline-none focus:border-[var(--bready-accent)] focus:shadow-[0_0_0_2px_var(--bready-accent)]',
    }

    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-[var(--bready-text-muted)]">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bready-text-muted)]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            disabled={disabled || loading}
            className={cn(
              'w-full rounded-lg text-[var(--bready-text)] placeholder:text-[var(--bready-text-muted)] transition-all disabled:cursor-not-allowed disabled:opacity-50',
              sizeClasses[size],
              variantClasses[variant],
              leftIcon && 'pl-10',
              (rightIcon || loading) && 'pr-10',
              error &&
                'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_1px_rgb(239,68,68)]',
              className,
            )}
            {...props}
          />

          {(rightIcon || loading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--bready-text-muted)]">
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p
            className={cn(
              'mt-2 text-sm',
              error ? 'text-red-600 dark:text-red-400' : 'text-[var(--bready-text-muted)]',
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  rows?: number
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, rows = 4, resize = 'vertical', className, ...props }, ref) => {
    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    }

    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-[var(--bready-text-muted)]">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            'w-full rounded-lg border border-[var(--bready-border)] bg-[var(--bready-surface)] px-4 py-2.5 text-sm text-[var(--bready-text)] placeholder:text-[var(--bready-text-muted)] transition-all focus:outline-none focus:border-[var(--bready-accent)] focus:shadow-[0_0_0_2px_var(--bready-accent)] disabled:cursor-not-allowed disabled:opacity-50',
            resizeClasses[resize],
            error && 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_2px_rgb(239,68,68)]',
            className,
          )}
          {...props}
        />

        {(error || helperText) && (
          <p
            className={cn(
              'mt-2 text-sm',
              error ? 'text-red-600 dark:text-red-400' : 'text-[var(--bready-text-muted)]',
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'

export const SearchInput: React.FC<{
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSearch?: (value: string) => void
  loading?: boolean
  className?: string
}> = ({ value, onChange, placeholder = '搜索...', onSearch, loading = false, className }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        loading={loading}
        leftIcon={
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        rightIcon={
          value && !loading ? (
            <button
              onClick={() => onChange('')}
              className="text-[var(--bready-text-muted)] hover:text-[var(--bready-text)]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : undefined
        }
      />
    </div>
  )
}
