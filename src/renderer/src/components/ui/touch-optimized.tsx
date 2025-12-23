import React from 'react'

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export const TouchButton: React.FC<TouchButtonProps> = ({ 
  children, 
  className = '',
  ...props 
}) => {
  return (
    <button
      {...props}
      className={`
        ${className}
        min-h-12  // 最小触摸目标高度
        min-w-12  // 最小触摸目标宽度
        active:scale-95  // 触摸反馈
        touch-manipulation  // 启用触摸优化
        transition-transform duration-100
      `}
    >
      {children}
    </button>
  )
}

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  className = ''
}) => {
  const [touchStart, setTouchStart] = React.useState<{ x: number, y: number } | null>(null)
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    })
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    }
    
    const deltaX = touchEnd.x - touchStart.x
    const deltaY = touchEnd.y - touchStart.y
    
    // 确保是水平滑动且幅度足够
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    }
    
    setTouchStart(null)
  }
  
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`
        touch-pan-x touch-pinch-zoom
        ${className}
      `}
    >
      {children}
    </div>
  )
}