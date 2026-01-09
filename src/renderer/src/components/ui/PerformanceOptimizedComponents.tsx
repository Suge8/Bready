/**
 * 性能优化的UI组件
 * 提供高性能的基础UI组件
 */

import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  ReactNode,
  HTMLAttributes,
  ButtonHTMLAttributes,
} from 'react'
import {
  useVirtualScroll,
  useDebounce,
  usePerformanceMonitor,
} from '../../hooks/usePerformanceOptimization'

// 基础按钮组件优化
interface OptimizedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}

export const OptimizedButton = memo<OptimizedButtonProps>(
  ({
    children,
    loading = false,
    variant = 'primary',
    size = 'md',
    icon,
    className = '',
    onClick,
    disabled,
    ...props
  }) => {
    usePerformanceMonitor('OptimizedButton')

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (loading || disabled) return
        onClick?.(e)
      },
      [onClick, loading, disabled],
    )

    const buttonClasses = useMemo(() => {
      const baseClasses =
        'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

      const variants = {
        primary: 'bg-black text-white hover:bg-gray-800 focus:ring-gray-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      }

      const sizes = {
        sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
        md: 'px-4 py-2 text-sm rounded-lg gap-2',
        lg: 'px-6 py-3 text-base rounded-lg gap-2',
      }

      return [baseClasses, variants[variant], sizes[size], className].join(' ')
    }, [variant, size, className])

    return (
      <button
        className={buttonClasses}
        onClick={handleClick}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  },
)

OptimizedButton.displayName = 'OptimizedButton'

// 虚拟化列表组件
interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => ReactNode
  keyExtractor: (item: T, index: number) => string
  onEndReached?: () => void
  endReachedThreshold?: number
  className?: string
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  keyExtractor,
  onEndReached,
  endReachedThreshold = 0.1,
  className = '',
}: VirtualListProps<T>) {
  usePerformanceMonitor('VirtualList')

  const {
    startIndex,
    items: visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  } = useVirtualScroll(items, itemHeight, height)

  const containerRef = useRef<HTMLDivElement>(null)
  const [hasReachedEnd, setHasReachedEnd] = useState(false)

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      handleScroll(e)

      // 检查是否到达底部
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      const threshold = scrollHeight * endReachedThreshold

      if (scrollTop + clientHeight >= scrollHeight - threshold && !hasReachedEnd) {
        setHasReachedEnd(true)
        onEndReached?.()
      } else if (scrollTop + clientHeight < scrollHeight - threshold && hasReachedEnd) {
        setHasReachedEnd(false)
      }
    },
    [handleScroll, onEndReached, endReachedThreshold, hasReachedEnd],
  )

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, virtualIndex) => {
            const actualIndex = startIndex + virtualIndex
            return (
              <div key={keyExtractor(item, actualIndex)} style={{ height: itemHeight }}>
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 防抖输入框组件
interface DebouncedInputProps extends HTMLAttributes<HTMLInputElement> {
  value: string
  onDebouncedChange: (value: string) => void
  delay?: number
  placeholder?: string
  className?: string
}

export const DebouncedInput = memo<DebouncedInputProps>(
  ({ value, onDebouncedChange, delay = 300, placeholder, className = '', ...props }) => {
    usePerformanceMonitor('DebouncedInput')

    const [localValue, setLocalValue] = useState(value)
    const debouncedValue = useDebounce(localValue, delay)

    useEffect(() => {
      setLocalValue(value)
    }, [value])

    useEffect(() => {
      if (debouncedValue !== value) {
        onDebouncedChange(debouncedValue)
      }
    }, [debouncedValue, value, onDebouncedChange])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value)
    }, [])

    return (
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
        {...props}
      />
    )
  },
)

DebouncedInput.displayName = 'DebouncedInput'

// 懒加载图片组件
interface LazyImageProps extends HTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholder?: string
  className?: string
  onLoad?: () => void
  onError?: () => void
}

export const LazyImage = memo<LazyImageProps>(
  ({
    src,
    alt,
    placeholder = 'data:image/svg+xml,%3Csvg width="400" height="300" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="100%25" height="100%25" fill="%23f3f4f6"/%3E%3C/svg%3E',
    className = '',
    onLoad,
    onError,
    ...props
  }) => {
    usePerformanceMonitor('LazyImage')

    const [imageSrc, setImageSrc] = useState(placeholder)
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const imgRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
      const img = imgRef.current
      if (!img) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const image = new Image()

            image.onload = () => {
              setImageSrc(src)
              setIsLoading(false)
              onLoad?.()
            }

            image.onerror = () => {
              setHasError(true)
              setIsLoading(false)
              onError?.()
            }

            image.src = src
            observer.disconnect()
          }
        },
        { threshold: 0.1 },
      )

      observer.observe(img)

      return () => observer.disconnect()
    }, [src, onLoad, onError])

    return (
      <div className={`relative ${className}`}>
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-50' : 'opacity-100'
          }`}
          {...props}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
            图片加载失败
          </div>
        )}
      </div>
    )
  },
)

LazyImage.displayName = 'LazyImage'

// 性能监控的高阶组件
interface WithPerformanceMonitoringProps {
  componentName?: string
}

export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  defaultName?: string,
) {
  const WrappedComponent = (props: P & WithPerformanceMonitoringProps) => {
    const { componentName, ...restProps } = props
    usePerformanceMonitor(
      componentName || defaultName || Component.displayName || 'UnknownComponent',
    )

    return <Component {...(restProps as P)} />
  }

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`

  return memo(WrappedComponent)
}

// 渲染优化的容器组件
interface OptimizedContainerProps {
  children: ReactNode
  className?: string
  enableVirtualization?: boolean
  maxHeight?: number
}

export const OptimizedContainer = memo<OptimizedContainerProps>(
  ({ children, className = '', enableVirtualization = false, maxHeight = 500 }) => {
    usePerformanceMonitor('OptimizedContainer')

    const containerRef = useRef<HTMLDivElement>(null)
    const [shouldRender, setShouldRender] = useState(true)

    useEffect(() => {
      if (!enableVirtualization) return

      const container = containerRef.current
      if (!container) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          setShouldRender(entry.isIntersecting)
        },
        { threshold: 0 },
      )

      observer.observe(container)

      return () => observer.disconnect()
    }, [enableVirtualization])

    return (
      <div
        ref={containerRef}
        className={className}
        style={enableVirtualization ? { minHeight: '1px' } : undefined}
      >
        {shouldRender ? children : <div style={{ height: maxHeight }} />}
      </div>
    )
  },
)

OptimizedContainer.displayName = 'OptimizedContainer'
