import React, { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent'
  size?: 'sm' | 'md' | 'lg'
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full'

  const getVariantStyle = (variant: string) => {
    const styles: Record<string, React.CSSProperties> = {
      default: {
        backgroundColor: 'var(--slate-100)',
        color: 'var(--text-primary)',
      },
      success: {
        backgroundColor: 'var(--status-ready-bg)',
        color: 'var(--status-ready-text)',
      },
      warning: {
        backgroundColor: 'var(--status-production-bg)',
        color: 'var(--status-production-text)',
      },
      error: {
        backgroundColor: 'var(--status-onair-bg)',
        color: 'var(--status-onair-text)',
      },
      info: {
        backgroundColor: 'var(--status-confirmed-bg)',
        color: 'var(--status-confirmed-text)',
      },
      accent: {
        background: 'linear-gradient(to right, var(--accent), var(--accent-hover))',
        color: 'var(--text-primary)',
      },
    }
    return styles[variant] || styles.default
  }

  const variants = {
    default: '',
    success: '',
    warning: '',
    error: '',
    info: '',
    accent: 'font-semibold',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      style={getVariantStyle(variant)}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge

