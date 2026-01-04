import React from 'react'

// 更新 Card 组件以支持暗黑模式
export interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
  hover?: boolean
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'sm',
  border = true,
  hover = false,
  onClick
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  }

  const baseClasses = `
    bg-[var(--bready-surface)] rounded-lg
    ${border ? 'border border-[var(--bready-border)]' : ''}
    ${shadowClasses[shadow]}
    ${paddingClasses[padding]}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim()

  if (onClick) {
    return (
      <div
        className={baseClasses}
        onClick={onClick}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={baseClasses}>
      {children}
    </div>
  )
}

export interface CardHeaderProps {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, className = '', children }) => {
  if (children) {
    return (
      <div className={`mb-4 ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        {title && (
          <h3 className="text-lg font-semibold text-[var(--bready-text)]">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-[var(--bready-text-muted)] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}

export interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-[var(--bready-text)] ${className}`}>
      {children}
    </h3>
  )
}

export interface CardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = '' }) => {
  return (
    <p className={`text-sm text-[var(--bready-text-muted)] ${className}`}>
      {children}
    </p>
  )
}

export interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`text-[var(--bready-text)] ${className}`}>
      {children}
    </div>
  )
}

export interface CardFooterProps {
  children: React.ReactNode
  className?: string
  justify?: 'start' | 'center' | 'end' | 'between'
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '', justify = 'end' }) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between'
  }

  return (
    <div className={`flex items-center mt-4 pt-4 border-t border-[var(--bready-border)] ${justifyClasses[justify]} ${className}`}>
      {children}
    </div>
  )
}
