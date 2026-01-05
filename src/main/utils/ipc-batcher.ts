/**
 * IPC 消息批处理器
 * 将高频 IPC 消息批量发送，减少通信开销
 */

import { BrowserWindow } from 'electron'
import { recordMetric } from './metrics'

interface QueuedMessage {
  channel: string
  data: any
}

interface WindowQueue {
  queue: QueuedMessage[]
  timer: NodeJS.Timeout | null
}

export class IPCBatcher {
  private queues = new Map<number, WindowQueue>()
  private readonly batchWindow: number
  private readonly maxBatchSize: number
  private queuedCount = 0
  private sentCount = 0
  private batchCount = 0

  constructor(batchWindow = 10, maxBatchSize = 50) {
    this.batchWindow = batchWindow // ms
    this.maxBatchSize = maxBatchSize
  }

  private getQueueEntry(window: BrowserWindow): WindowQueue {
    const id = window.webContents.id
    let entry = this.queues.get(id)
    if (!entry) {
      entry = { queue: [], timer: null }
      this.queues.set(id, entry)
      window.once('closed', () => {
        this.clearEntry(id)
      })
    }
    return entry
  }

  private clearEntry(id: number): void {
    const entry = this.queues.get(id)
    if (!entry) return
    if (entry.timer) {
      clearTimeout(entry.timer)
    }
    this.queues.delete(id)
  }

  private shouldSendAll(channel: string): boolean {
    const noThrottleChannels = [
      'transcription-update',
      'transcription-complete',
      'ai-response-update',
      'ai-response'
    ]
    return noThrottleChannels.includes(channel)
  }

  /**
   * 添加消息到队列
   */
  send(window: BrowserWindow | null, channel: string, data?: any): void {
    if (!window || window.isDestroyed() || window.webContents.isDestroyed()) {
      return
    }

    // 关键消息立即发送
    if (this.isHighPriority(channel)) {
      window.webContents.send(channel, data)
      this.sentCount += 1
      return
    }

    const entry = this.getQueueEntry(window)
    entry.queue.push({ channel, data })

    // 达到批次大小立即发送
    if (entry.queue.length >= this.maxBatchSize) {
      this.flush(window)
      return
    }

    // 启动定时器
    if (!entry.timer) {
      entry.timer = setTimeout(() => {
        this.flush(window)
      }, this.batchWindow)
    }
  }

  /**
   * 立即发送所有待处理消息
   */
  flush(window: BrowserWindow | null): void {
    if (!window || window.isDestroyed() || window.webContents.isDestroyed()) {
      if (window?.webContents?.id) {
        this.clearEntry(window.webContents.id)
      }
      return
    }

    const entry = this.getQueueEntry(window)
    if (entry.queue.length === 0) {
      this.clearTimer(entry)
      return
    }

    const messages = entry.queue.splice(0, entry.queue.length)
    this.batchCount += 1
    this.queuedCount += messages.length

    // 按通道分组以优化处理
    const grouped = this.groupByChannel(messages)

    for (const [channel, dataList] of Object.entries(grouped)) {
      if (dataList.length === 1 || this.shouldSendAll(channel)) {
        for (const item of dataList) {
          window.webContents.send(channel, item)
          this.sentCount += 1
        }
      } else {
        window.webContents.send(channel, dataList[dataList.length - 1])
        this.sentCount += 1
      }
    }

    // 定期记录统计
    if (this.batchCount % 100 === 0) {
      recordMetric('ipc.batch.stats', {
        batches: this.batchCount,
        queued: this.queuedCount,
        sent: this.sentCount,
        avgPerBatch: (this.sentCount / this.batchCount).toFixed(2)
      })
    }

    this.clearTimer(entry)
  }

  /**
   * 判断是否为高优先级消息（需要立即发送）
   */
  private isHighPriority(channel: string): boolean {
    const highPriorityChannels = [
      'session-error',
      'session-ready',
      'session-closed',
      'audio-stream-interrupted',
      'audio-stream-restored'
    ]
    return highPriorityChannels.includes(channel)
  }

  /**
   * 按通道分组消息
   */
  private groupByChannel(messages: QueuedMessage[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {}
    for (const msg of messages) {
      if (!grouped[msg.channel]) {
        grouped[msg.channel] = []
      }
      grouped[msg.channel].push(msg.data)
    }
    return grouped
  }

  /**
   * 清除定时器
   */
  private clearTimer(entry: WindowQueue): void {
    if (entry.timer) {
      clearTimeout(entry.timer)
      entry.timer = null
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      queueSize: Array.from(this.queues.values()).reduce((sum, entry) => sum + entry.queue.length, 0),
      queuedCount: this.queuedCount,
      sentCount: this.sentCount,
      batchCount: this.batchCount,
      avgPerBatch: this.batchCount > 0 ? (this.sentCount / this.batchCount).toFixed(2) : 0
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    for (const entry of this.queues.values()) {
      this.clearTimer(entry)
    }
    this.queues.clear()
  }
}

// 单例实例
let batcherInstance: IPCBatcher | null = null

export function getIPCBatcher(): IPCBatcher {
  if (!batcherInstance) {
    batcherInstance = new IPCBatcher()
  }
  return batcherInstance
}
