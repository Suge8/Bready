import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  container?: boolean
}

export function Skeleton({ className, container, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        container ? 'bg-black/5 dark:bg-white/5' : 'bg-black/10 dark:bg-white/10',
        className,
      )}
      {...props}
    >
      <motion.div
        className="absolute inset-0 z-10"
        style={{
          backgroundImage: `linear-gradient(
            90deg,
            transparent 0%,
            var(--skeleton-highlight, rgba(255, 255, 255, 0.4)) 50%,
            transparent 100%
          )`,
        }}
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'linear',
        }}
      />
      <div className="absolute inset-0 dark:hidden pointer-events-none mix-blend-overlay opacity-20 bg-gradient-to-r from-transparent via-black to-transparent animate-shimmer" />
      <div className="absolute inset-0 hidden dark:block pointer-events-none mix-blend-overlay opacity-20 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
    </div>
  )
}

export function PreparationCardSkeleton() {
  return (
    <div className="relative h-[145px] w-full rounded-2xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 overflow-hidden p-3.5 flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>

      <div className="space-y-2 mt-1">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md opacity-70" />
      </div>

      <div className="flex-1" />

      <div className="flex items-end justify-between mt-auto">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-12 rounded-lg" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2 w-8 rounded-full" />
            <Skeleton className="h-1.5 w-12 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-4 w-16 rounded-md" />
      </div>
    </div>
  )
}

export function MainPageSkeleton() {
  return (
    <div className="h-screen w-full bg-[var(--bready-bg)] flex flex-col overflow-hidden">
      <header className="flex-shrink-0 h-16 w-full max-w-6xl mx-auto px-4 flex items-center justify-between mt-8">
        <div className="flex items-center gap-3 ml-16">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full mr-2" />
      </header>

      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-8 mt-12">
        <div className="flex-1 flex flex-col justify-center items-center text-center min-h-0 -mt-20">
          <Skeleton className="h-16 w-3/4 max-w-lg rounded-2xl mb-6" />
          <Skeleton className="h-6 w-96 rounded-lg mb-12 opacity-60" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>

        <div className="w-full pb-12 flex-shrink-0">
          <div className="flex items-center justify-between px-1 mb-4">
            <Skeleton className="h-5 w-32 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <PreparationCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
