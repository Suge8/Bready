/**
 * 跨平台音频捕获接口定义
 * 支持 macOS (SystemAudioDump) 和 Windows (WASAPI Loopback)
 */

export interface AudioCaptureConfig {
  sampleRate: number
  channels: number
  bitDepth: number
}

export interface AudioCaptureResult {
  success: boolean
  error?: string
  pid?: number
}

export type AudioCaptureDataCallback = (buffer: Buffer) => void
export type AudioCaptureErrorCallback = (error: Error) => void

/**
 * 音频捕获提供者接口
 * 各平台实现此接口以提供统一的音频捕获能力
 */
export interface AudioCaptureProvider {
  /** 平台标识 */
  readonly platform: NodeJS.Platform

  /** 检查当前平台是否可用 */
  isAvailable(): Promise<boolean>

  /** 启动音频捕获 */
  start(config?: Partial<AudioCaptureConfig>): Promise<AudioCaptureResult>

  /** 停止音频捕获 */
  stop(): Promise<AudioCaptureResult>

  /** 注册音频数据回调 */
  onData(callback: AudioCaptureDataCallback): void

  /** 注册错误回调 */
  onError(callback: AudioCaptureErrorCallback): void

  /** 移除所有监听器 */
  removeAllListeners(): void

  on(event: string, listener: (...args: any[]) => void): void

  dispose(): void

  /** 获取当前进程 PID (如果有) */
  getPid(): number | null
}

/** 默认音频配置 */
export const DEFAULT_AUDIO_CONFIG: AudioCaptureConfig = {
  sampleRate: 48000,
  channels: 2,
  bitDepth: 16,
}
