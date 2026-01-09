/**
 * 音频处理优化器
 * 提供高性能的音频处理和缓存机制
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

interface AudioConfig {
  sampleRate: number
  channels: number
  bitDepth: number
  bufferSize: number
  enableNoiseGate: boolean
  noiseThreshold: number
}

interface AudioMetrics {
  totalChunks: number
  validChunks: number
  silentChunks: number
  avgLatency: number
  lastProcessTime: number
}

export class OptimizedAudioProcessor extends EventEmitter {
  private config: AudioConfig
  private metrics: AudioMetrics
  private audioProcess: ChildProcess | null = null
  private isProcessing = false
  private audioQueue: Buffer[] = []
  private processingQueue = false

  // 性能优化配置
  private readonly MAX_QUEUE_SIZE = 10
  private readonly BATCH_PROCESS_SIZE = 3

  constructor(config: Partial<AudioConfig> = {}) {
    super()

    this.config = {
      sampleRate: 24000,
      channels: 1,
      bitDepth: 16,
      bufferSize: 4096,
      enableNoiseGate: true,
      noiseThreshold: 0.005,
      ...config,
    }

    this.metrics = {
      totalChunks: 0,
      validChunks: 0,
      silentChunks: 0,
      avgLatency: 0,
      lastProcessTime: 0,
    }
  }

  /**
   * 启动音频捕获（优化版）
   */
  async startCapture(): Promise<boolean> {
    if (this.isProcessing) {
      console.log('🎵 音频捕获已在运行')
      return true
    }

    try {
      console.log('🚀 启动优化音频捕获...')

      // 使用更高效的系统音频捕获
      this.audioProcess = spawn('system_profiler', ['SPAudioDataType', '-json'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      // 设置音频数据处理
      this.setupAudioProcessing()

      this.isProcessing = true
      this.emit('capture-started')

      console.log('✅ 优化音频捕获启动成功')
      return true
    } catch (error) {
      console.error('❌ 音频捕获启动失败:', error)
      this.isProcessing = false
      return false
    }
  }

  /**
   * 设置音频处理管道
   */
  private setupAudioProcessing() {
    if (!this.audioProcess) return

    this.audioProcess.stdout?.on('data', (data: Buffer) => {
      this.handleAudioChunk(data)
    })

    this.audioProcess.stderr?.on('data', (data: Buffer) => {
      console.warn('🎵 音频进程警告:', data.toString())
    })

    this.audioProcess.on('exit', (code) => {
      console.log(`🎵 音频进程退出，代码: ${code}`)
      this.isProcessing = false
      this.emit('capture-stopped')
    })
  }

  /**
   * 处理音频数据块（优化版）
   */
  private async handleAudioChunk(chunk: Buffer) {
    const startTime = Date.now()
    this.metrics.totalChunks++

    try {
      // 快速静音检测
      if (this.config.enableNoiseGate && this.isSilent(chunk)) {
        this.metrics.silentChunks++
        return // 跳过静音片段
      }

      // 添加到队列
      this.audioQueue.push(chunk)
      this.metrics.validChunks++

      // 队列管理
      if (this.audioQueue.length > this.MAX_QUEUE_SIZE) {
        this.audioQueue.shift() // 移除最旧的数据
        console.warn('⚠️ 音频队列溢出，丢弃旧数据')
      }

      // 批量处理
      if (!this.processingQueue && this.audioQueue.length >= this.BATCH_PROCESS_SIZE) {
        this.processBatch()
      }

      // 更新性能指标
      this.updateMetrics(startTime)
    } catch (error) {
      console.error('❌ 音频块处理失败:', error)
    }
  }

  /**
   * 快速静音检测
   */
  private isSilent(buffer: Buffer): boolean {
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2)
    let energy = 0
    const sampleCount = Math.min(samples.length, 1024) // 只检测前1024个样本

    for (let i = 0; i < sampleCount; i++) {
      const normalized = samples[i] / 32768
      energy += normalized * normalized
    }

    const rms = Math.sqrt(energy / sampleCount)
    return rms < this.config.noiseThreshold
  }

  /**
   * 批量处理音频数据
   */
  private async processBatch() {
    if (this.processingQueue || this.audioQueue.length === 0) return

    this.processingQueue = true

    try {
      const batchSize = Math.min(this.BATCH_PROCESS_SIZE, this.audioQueue.length)
      const batch = this.audioQueue.splice(0, batchSize)

      // 合并音频块
      const combinedBuffer = Buffer.concat(batch)

      // 发送到AI处理
      this.emit('audio-data', combinedBuffer)

      console.log(`🎵 处理音频批次: ${batchSize}块, ${combinedBuffer.length}字节`)
    } catch (error) {
      console.error('❌ 批量处理失败:', error)
    } finally {
      this.processingQueue = false

      // 如果还有数据，继续处理
      if (this.audioQueue.length >= this.BATCH_PROCESS_SIZE) {
        setImmediate(() => this.processBatch())
      }
    }
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(startTime: number) {
    const processingTime = Date.now() - startTime
    this.metrics.lastProcessTime = processingTime

    // 计算平均延迟
    this.metrics.avgLatency = this.metrics.avgLatency * 0.9 + processingTime * 0.1

    // 定期报告性能
    if (this.metrics.totalChunks % 100 === 0) {
      this.reportPerformance()
    }
  }

  /**
   * 性能报告
   */
  private reportPerformance() {
    const validRate = ((this.metrics.validChunks / this.metrics.totalChunks) * 100).toFixed(1)
    const silentRate = ((this.metrics.silentChunks / this.metrics.totalChunks) * 100).toFixed(1)

    console.log(
      `📊 音频性能: 总量=${this.metrics.totalChunks}, 有效=${validRate}%, 静音=${silentRate}%, 延迟=${this.metrics.avgLatency.toFixed(1)}ms`,
    )
  }

  /**
   * 停止音频捕获
   */
  stopCapture() {
    console.log('🛑 停止音频捕获...')

    if (this.audioProcess) {
      this.audioProcess.kill('SIGTERM')
      this.audioProcess = null
    }

    this.isProcessing = false
    this.audioQueue.length = 0
    this.processingQueue = false

    this.emit('capture-stopped')
    console.log('✅ 音频捕获已停止')
  }

  /**
   * 获取性能指标
   */
  getMetrics(): AudioMetrics {
    return { ...this.metrics }
  }

  /**
   * 重置性能指标
   */
  resetMetrics() {
    this.metrics = {
      totalChunks: 0,
      validChunks: 0,
      silentChunks: 0,
      avgLatency: 0,
      lastProcessTime: 0,
    }
  }

  /**
   * 动态调整配置
   */
  updateConfig(newConfig: Partial<AudioConfig>) {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 音频配置已更新:', newConfig)
  }
}
