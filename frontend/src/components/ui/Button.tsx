import React, { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex cursor-pointer items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]'

    const variants = {
      primary:
        'bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm hover:shadow-md transition-all focus:ring-blue-500 border border-blue-500/40',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold border border-slate-700/80 transition-all focus:ring-slate-500 shadow-sm',
      outline:
        'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white transition-colors focus:ring-slate-500',
      ghost:
        'bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors focus:ring-slate-500',
      danger:
        'bg-red-600 hover:bg-red-500 text-white font-semibold shadow-sm transition-all focus:ring-red-500 border border-red-500/40',
      accent:
        'bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm transition-all focus:ring-blue-500 border border-blue-500/40',
    }

    const sizes = {
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-3.5 py-1.5 text-sm',
      lg: 'px-5 py-2.5 text-base',
    }

    // Styles inline
    const getVariantStyle = () => {
      return undefined
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        style={getVariantStyle()}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Chargement...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button

