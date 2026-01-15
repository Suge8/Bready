import { createLogger } from './logging'

type CleanupFn = () => void | Promise<void>

const logger = createLogger('cleanup')
const cleanupTasks = new Set<CleanupFn>()
let cleanupRunning = false

export function registerCleanup(task: CleanupFn): () => void {
  cleanupTasks.add(task)
  return () => cleanupTasks.delete(task)
}

export async function runCleanup(reason: string): Promise<void> {
  if (cleanupRunning) return
  cleanupRunning = true

  const tasks = Array.from(cleanupTasks)
  cleanupTasks.clear()

  for (const task of tasks) {
    try {
      await task()
    } catch (error) {
      logger.error(`清理任务失败 (${reason})`, {
        error:
          error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      })
    }
  }
}
