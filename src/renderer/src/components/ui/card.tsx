import React from "react"
import { cn } from "../../lib/utils"

export interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: "none" | "sm" | "md" | "lg"
  shadow?: "none" | "sm" | "md" | "lg"
  border?: boolean
  hover?: boolean
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = "md",
  shadow = "sm",
  border = true,
  hover = false,
  onClick,
}) => {
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  }

  const shadowClasses = {
    none: "",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
  }

  return (
    <div
      className={cn(
        "rounded-xl bg-[var(--bready-surface)] text-[var(--bready-text)]",
        border && "border border-[var(--bready-border)]",
        shadowClasses[shadow],
        paddingClasses[padding],
        hover && "transition-shadow hover:shadow-md",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
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

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
  children,
}) => {
  if (children) {
    return <div className={cn("mb-4", className)}>{children}</div>
  }

  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div>
        {title && (
          <h3 className="text-lg font-semibold text-[var(--bready-text)]">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--bready-text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className,
}) => {
  return (
    <h3 className={cn("text-lg font-semibold text-[var(--bready-text)]", className)}>
      {children}
    </h3>
  )
}

export interface CardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  children,
  className,
}) => {
  return (
    <p className={cn("text-sm text-[var(--bready-text-muted)]", className)}>
      {children}
    </p>
  )
}

export interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
}) => {
  return <div className={cn("text-[var(--bready-text)]", className)}>{children}</div>
}

export interface CardFooterProps {
  children: React.ReactNode
  className?: string
  justify?: "start" | "center" | "end" | "between"
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  justify = "end",
}) => {
  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  }

  return (
    <div
      className={cn(
        "mt-4 flex items-center border-t border-[var(--bready-border)] pt-4",
        justifyClasses[justify],
        className
      )}
    >
      {children}
    </div>
  )
}
