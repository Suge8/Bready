/**
 * React性能优化Hook集合
 * 提供组件级别的性能优化工具
 */

import { 
  useCallback, 
  useMemo, 
  useRef, 
  useEffect, 
  useState,
  DependencyList 
} from 'react'

/**
 * 防抖Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 节流Hook
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      
      if (now - lastCall.current >= delay) {
        lastCall.current = now
        return callback(...args)
      } else {
        // 清除之前的延迟调用
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        // 设置新的延迟调用
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now()
          callback(...args)
        }, delay - (now - lastCall.current))
      }
    }) as T,
    [callback, delay]
  )
}

/**
 * 性能监控Hook
 */
export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0)
  const renderCount = useRef<number>(0)
  const maxRenderTime = useRef<number>(0)
  const avgRenderTime = useRef<number>(0)

  useEffect(() => {
    renderStartTime.current = performance.now()
    renderCount.current++
  })

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current
    
    // 更新最大渲染时间
    if (renderTime > maxRenderTime.current) {
      maxRenderTime.current = renderTime
    }
    
    // 更新平均渲染时间
    avgRenderTime.current = (avgRenderTime.current * (renderCount.current - 1) + renderTime) / renderCount.current
    
    // 性能警告
    if (renderTime > 16) { // 超过一帧的时间
      console.warn(`⚠️ ${componentName} 渲染时间过长: ${renderTime.toFixed(2)}ms`)
    }
    
    // 定期报告性能
    if (renderCount.current % 50 === 0) {
      console.log(`📊 ${componentName} 性能报告:`, {
        renders: renderCount.current,
        avgTime: avgRenderTime.current.toFixed(2) + 'ms',
        maxTime: maxRenderTime.current.toFixed(2) + 'ms'
      })
    }
  })

  return {
    renderCount: renderCount.current,
    avgRenderTime: avgRenderTime.current,
    maxRenderTime: maxRenderTime.current
  }
}

/**
 * 智能缓存Hook
 */
export function useSmartMemo<T>(
  factory: () => T,
  deps: DependencyList,
  options: {
    maxAge?: number // 缓存最大存活时间（毫秒）
    compareFunc?: (a: DependencyList, b: DependencyList) => boolean
  } = {}
): T {
  const { maxAge = 60000, compareFunc } = options
  const cacheRef = useRef<{
    value: T
    deps: DependencyList
    timestamp: number
  } | null>(null)

  return useMemo(() => {
    const now = Date.now()
    
    // 检查缓存是否有效
    if (cacheRef.current) {
      const { value, deps: cachedDeps, timestamp } = cacheRef.current
      
      // 检查是否过期
      if (now - timestamp > maxAge) {
        cacheRef.current = null
      } else {
        // 检查依赖是否变化
        const depsEqual = compareFunc 
          ? compareFunc(deps, cachedDeps)
          : deps.length === cachedDeps.length && deps.every((dep, i) => dep === cachedDeps[i])
        
        if (depsEqual) {
          return value
        }
      }
    }
    
    // 计算新值并缓存
    const value = factory()
    cacheRef.current = { value, deps, timestamp: now }
    return value
  }, deps)
}

/**
 * 虚拟滚动Hook
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }, [items, itemHeight, containerHeight, scrollTop, overscan])
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])
  
  return {
    ...visibleItems,
    handleScroll
  }
}

/**
 * 组件懒加载Hook
 */
export function useLazyComponent<T>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const [Component, setComponent] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    let mounted = true
    
    importFunc()
      .then((module) => {
        if (mounted) {
          setComponent(() => module.default)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err)
          setLoading(false)
        }
      })
    
    return () => {
      mounted = false
    }
  }, [importFunc])
  
  return { Component, loading, error }
}

/**
 * 批量状态更新Hook
 */
export function useBatchedState<T>(initialValue: T) {
  const [state, setState] = useState(initialValue)
  const pendingUpdates = useRef<Array<(prev: T) => T>>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const batchedSetState = useCallback((updater: (prev: T) => T | T) => {
    if (typeof updater === 'function') {
      pendingUpdates.current.push(updater as (prev: T) => T)
    } else {
      pendingUpdates.current.push(() => updater)
    }
    
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // 在下一个事件循环中批量应用更新
    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        let newState = prevState
        pendingUpdates.current.forEach(update => {
          newState = update(newState)
        })
        pendingUpdates.current.length = 0
        return newState
      })
    }, 0)
  }, [])
  
  return [state, batchedSetState] as const
}