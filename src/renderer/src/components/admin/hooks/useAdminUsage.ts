import { useState, useCallback } from 'react'
import { usageRecordService } from '../../../lib/api-client'
import type { UsageRecordWithUser } from '../types'

export function useAdminUsage() {
  const [usageRecords, setUsageRecords] = useState<UsageRecordWithUser[]>([])
  const [usageLoading, setUsageLoading] = useState(false)
  const [expandedUsageUsers, setExpandedUsageUsers] = useState<Set<string>>(new Set())

  const loadUsageRecords = useCallback(async () => {
    setUsageLoading(true)
    try {
      const records = await usageRecordService.getAllRecords()
      setUsageRecords(records)
    } catch (error) {
      console.error('Error loading usage records:', error)
    } finally {
      setUsageLoading(false)
    }
  }, [])

  return {
    usageRecords,
    usageLoading,
    expandedUsageUsers,
    setExpandedUsageUsers,
    loadUsageRecords,
  }
}
