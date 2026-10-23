import React, { ButtonHTMLAttributes, ReactNode } from 'react'

// ----------------------
// 🎨 TypeScript Types
// ----------------------

type Variant = 'primary' | 'sky' | 'amber' | 'danger' | 'outline' | 'ghost' | 'muted'
type Size = 'sm' | 'md' | 'lg'
type IconName =
  | 'add'
  | 'pdf'
  | 'export'
  | 'upload'
  | 'moon'
  | 'sun'
  | 'logout'
  | 'edit'
  | 'duplicate'
  | 'trash'
  | 'close'
  | 'reset'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: Variant
  size?: Size
  icon?: IconName
  iconPosition?: 'left' | 'right'
  className?: string
}

interface IconProps {
  name: IconName
  className?: string
}

// ----------------------
// 🎯 Constantes
// ----------------------

const VARIANT_MAP: Record<Variant, string> = {
  primary: 'btn-primary',
  sky: 'btn-sky',
  amber: 'btn-amber',
  danger: 'btn-danger',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  muted: 'btn-muted',
}

// ----------------------
// 🖼️ Icônes SVG
// ----------------------

const Icon: React.FC<IconProps> = ({ name, className = '' }) => {
  const common = `w-4 h-4 ${className}`.trim()

  switch (name) {
    case 'add':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
        </svg>
      )
    case 'pdf':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 2h6l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
          />
        </svg>
      )
    case 'export':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5-5 5 5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v12" />
        </svg>
      )
    case 'upload':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l-5-5-5 5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12" />
        </svg>
      )
    case 'moon':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          />
        </svg>
      )
    case 'sun':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      )
    case 'logout':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8v8a4 4 0 0 0 4 4h6" />
        </svg>
      )
    case 'edit':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 4h7v7" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11L13 19l-7 1 1-7 8-8z" />
        </svg>
      )
    case 'duplicate':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path
            d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'trash':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path
            d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'close':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    case 'reset':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 12A8 8 0 1 0 12 20"
          />
          <polyline points="20 12 20 8 16 8" />
        </svg>
      )
    default:
      return null
  }
}

// ----------------------
// 🔘 Button Component
// ----------------------

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  ...rest
}) => {
  const v = VARIANT_MAP[variant] || VARIANT_MAP.primary
  const s = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : 'btn-md'

  const content = (
    <>
      {icon && iconPosition === 'left' && <Icon name={icon} className="-ml-1" />}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <Icon name={icon} className="-mr-1" />}
    </>
  )

  return (
    <button type={type} className={`btn ${s} ${v} ${className}`.trim()} {...rest}>
      {content}
    </button>
  )
}

export default Button