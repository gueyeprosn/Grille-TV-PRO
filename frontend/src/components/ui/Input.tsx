import React, { InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, id, 'aria-describedby': describedBy, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div 
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted)' }}
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : ariaInvalid}
            aria-describedby={[describedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              Boolean(leftIcon) && 'pl-10',
              Boolean(rightIcon) && 'pr-10',
              error && 'border-red-500 focus:ring-red-500/50',
              className
            )}
            style={{
              backgroundColor: 'var(--card-bg-solid)',
              borderColor: error ? 'var(--border-error)' : 'var(--border)',
              color: 'var(--text-primary)',
            }}
            {...props}
          />
          {rightIcon && (
            <div 
              aria-hidden="true"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted)' }}
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm" style={{ color: 'var(--text-error)' }}>{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input

