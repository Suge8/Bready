import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-black text-white hover:bg-black/90 shadow-sm dark:bg-white dark:text-black dark:hover:bg-white/90',
        secondary:
          'bg-[var(--bready-surface-2)] text-[var(--bready-text)] hover:bg-[var(--bready-surface-3)]',
        outline:
          'border border-[var(--bready-border)] bg-transparent text-[var(--bready-text)] hover:bg-[var(--bready-surface-2)]',
        ghost: 'text-[var(--bready-text)] hover:bg-[var(--bready-surface-2)]',
        danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || loading
    const iconNode = loading ? (
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
    ) : (
      icon
    )

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), fullWidth && 'w-full')}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        ref={ref}
        {...props}
      >
        {iconNode && iconPosition === 'left' && iconNode}
        {children}
        {iconNode && iconPosition === 'right' && iconNode}
      </Comp>
    )
  },
)

Button.displayName = 'Button'

export const ButtonGroup: React.FC<{
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}> = ({ children, className, orientation = 'horizontal' }) => {
  return (
    <div
      className={cn(
        orientation === 'horizontal' ? 'flex flex-row gap-2' : 'flex flex-col gap-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

export const IconButton: React.FC<{
  icon: React.ReactNode
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  disabled?: boolean
  tooltip?: string
}> = ({ icon, onClick, size = 'md', variant = 'ghost', className, disabled = false, tooltip }) => {
  const sizeMap: Record<'sm' | 'md' | 'lg', ButtonProps['size']> = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      variant={variant}
      size={sizeMap[size]}
      className={cn('h-10 w-10 p-0', className)}
      disabled={disabled}
      aria-label={tooltip}
      title={tooltip}
    >
      {icon}
    </Button>
  )
}
