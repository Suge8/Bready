import { useState, useEffect, useCallback } from 'react'
import { membershipService, type PurchaseRecord } from '../../../lib/api-client'
import { useAuth } from '../../../contexts/AuthContext'

interface UsePurchaseHistoryReturn {
  records: PurchaseRecord[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

const PAGE_SIZE = 20

export function usePurchaseHistory(): UsePurchaseHistoryReturn {
  const { user } = useAuth()
  const [records, setRecords] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const loadRecords = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (!user?.id) return

      setLoading(true)
      setError(null)

      try {
        const result = await membershipService.getUserPurchasesPage(user.id, pageNum, PAGE_SIZE)
        if (append) {
          setRecords((prev) => [...prev, ...result.records])
        } else {
          setRecords(result.records)
        }
        setHasMore(result.hasMore)
      } catch (err) {
        console.error('Failed to load purchase history:', err)
        setError('加载购买记录失败')
      } finally {
        setLoading(false)
        setInitialLoading(false)
      }
    },
    [user?.id],
  )

  // 初始加载
  useEffect(() => {
    if (user?.id) {
      setPage(0)
      setHasMore(true)
      setRecords([])
      setInitialLoading(true)
      loadRecords(0, false)
    }
  }, [user?.id, loadRecords])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    await loadRecords(nextPage, true)
  }, [loading, hasMore, page, loadRecords])

  const refresh = useCallback(async () => {
    setPage(0)
    setHasMore(true)
    await loadRecords(0, false)
  }, [loadRecords])

  return {
    records,
    loading: initialLoading || loading,
    error,
    hasMore,
    loadMore,
    refresh,
  }
}
