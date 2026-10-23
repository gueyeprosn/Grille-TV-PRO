import React, { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass'
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, children, ...props }, ref) => {
    // Border-radius 12px selon audit UX (rounded-xl au lieu de rounded-2xl)
    const baseStyles = 'rounded-xl transition-all duration-300'

    const getVariantStyle = (variant: string) => {
      if (variant === 'outlined') {
        return {
          backgroundColor: 'transparent',
          borderColor: 'var(--border)',
        }
      }
      
      if (variant === 'glass') {
        return {
          backgroundColor: 'var(--card-bg-solid)',
          borderColor: 'var(--card-border)',
          opacity: 0.8,
        }
      }
      
      return {
        backgroundColor: 'var(--card-bg-solid)',
        borderColor: 'var(--card-border)',
      }
    }

    const variants = {
      default: 'border',
      elevated: 'shadow-lg border',
      outlined: 'bg-transparent border-2',
      glass: 'backdrop-blur-xl border shadow-xl',
    }

    const hoverStyles = hover
      ? 'hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 cursor-pointer'
      : ''

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], hoverStyles, className)}
        style={getVariantStyle(variant)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card

