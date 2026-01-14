import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface StatusIndicatorProps {
  isConnected: boolean
  status: string
  className?: string
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isConnected,
  status,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{
          scale: isConnected ? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 1.5,
          repeat: isConnected ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className={cn('w-1.5 h-1.5 rounded-full', isConnected ? 'bg-emerald-500' : 'bg-red-400')}
      />
      <span className="text-[10px] text-[var(--bready-text-muted)] opacity-70 truncate max-w-[200px]">
        {status}
      </span>
    </div>
  )
}
