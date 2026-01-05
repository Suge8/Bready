import { ipcMain } from 'electron'
import { getRecentMetrics } from '../utils/metrics'

ipcMain.handle('debug:get-runtime-metrics', (event, limit?: number) => {
  const safeLimit = typeof limit === 'number' && limit > 0 ? Math.min(limit, 500) : undefined
  return getRecentMetrics(safeLimit)
})

export {}
