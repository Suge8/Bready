import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-[var(--bready-border)] bg-[var(--bready-surface)] px-3 py-2 text-sm text-[var(--bready-text)] transition-colors placeholder:text-[var(--bready-text-muted)] focus-visible:outline-none focus-visible:border-black focus-visible:shadow-[0_0_0_1px_black] dark:focus-visible:border-white dark:focus-visible:shadow-[0_0_0_1px_white] hover:border-black/20 dark:hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
