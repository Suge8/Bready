import { spawn, ChildProcess } from 'child_process'
import { app } from 'electron'
import path from 'path'
import { EventEmitter } from 'events'
import type {
  AudioCaptureProvider,
  AudioCaptureResult,
  AudioCaptureConfig,
  AudioCaptureDataCallback,
  AudioCaptureErrorCallback,
} from '../types'

const debugAudio = process.env.DEBUG_AUDIO === '1'

function log(level: string, ...args: any[]) {
  if (debugAudio || level === 'error') {
    console[level === 'error' ? 'error' : 'log'](`[SystemAudioDump]`, ...args)
  }
}

export class SystemAudioDumpProvider extends EventEmitter implements AudioCaptureProvider {
  readonly platform: NodeJS.Platform = 'darwin'
  private proc: ChildProcess | null = null
  private dataCallback: AudioCaptureDataCallback | null = null
  private errorCallback: AudioCaptureErrorCallback | null = null

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'darwin') return false

    try {
      const execPath = this.getExecutablePath()
      const fs = await import('fs')
      await fs.promises.access(execPath, fs.constants.X_OK)
      return true
    } catch {
      return false
    }
  }

  private getExecutablePath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'SystemAudioDump')
    }
    return path.join(__dirname, '../../../assets', 'SystemAudioDump')
  }

  async start(_config?: Partial<AudioCaptureConfig>): Promise<AudioCaptureResult> {
    if (process.platform !== 'darwin') {
      return { success: false, error: 'SystemAudioDump 仅支持 macOS' }
    }

    await this.killExisting()

    const execPath = this.getExecutablePath()
    log('debug', '启动路径:', execPath)

    const spawnOptions = {
      stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PROCESS_NAME: 'AudioService',
        APP_NAME: 'System Audio Service',
      },
      detached: false,
    }

    this.proc = spawn(execPath, [], spawnOptions)

    if (!this.proc || !this.proc.pid) {
      this.proc = null
      return { success: false, error: '启动 SystemAudioDump 进程失败' }
    }

    log('debug', '启动成功，PID:', this.proc.pid)

    this.setupStdoutHandler()
    this.setupStderrHandler()
    this.setupProcessHandlers()

    await new Promise((resolve) => setTimeout(resolve, 1000))

    return { success: true, pid: this.proc?.pid || 0 }
  }

  private setupStdoutHandler() {
    if (!this.proc?.stdout) return

    let audioRemainder = Buffer.alloc(0)

    this.proc.stdout.on('data', (data: Buffer) => {
      const combined = audioRemainder.length ? Buffer.concat([audioRemainder, data]) : data
      const alignedLength = combined.length - (combined.length % 4)
      const alignedBuffer =
        alignedLength > 0 ? combined.subarray(0, alignedLength) : Buffer.alloc(0)
      audioRemainder =
        alignedLength < combined.length ? combined.subarray(alignedLength) : Buffer.alloc(0)

      if (alignedBuffer.length > 0 && this.dataCallback) {
        this.dataCallback(alignedBuffer)
      }
    })
  }

  private setupStderrHandler() {
    if (!this.proc?.stderr) return

    this.proc.stderr.on('data', (data: Buffer) => {
      const errorMsg = data.toString()
      log('debug', 'stderr:', errorMsg)

      if (
        errorMsg.includes('系统已停止流播放') ||
        errorMsg.includes('Stream stopped with error') ||
        errorMsg.includes('SCStreamErrorDomain')
      ) {
        this.emit('stream-interrupted')
        if (this.errorCallback) {
          this.errorCallback(new Error('macOS 停止了系统音频流'))
        }
      }
    })
  }

  private setupProcessHandlers() {
    if (!this.proc) return

    this.proc.on('close', (code: number | null) => {
      log('debug', '进程关闭，退出码:', code)
      this.emit('close', code)
      this.proc = null
    })

    this.proc.on('error', (err: Error) => {
      log('error', '进程错误:', err)
      if (this.errorCallback) {
        this.errorCallback(err)
      }
      this.proc = null
    })
  }

  async stop(): Promise<AudioCaptureResult> {
    if (this.proc) {
      log('debug', '停止进程...')
      this.proc.kill('SIGTERM')
      this.proc = null
      log('debug', '已停止')
    }
    return { success: true }
  }

  private async killExisting(): Promise<void> {
    return new Promise((resolve) => {
      log('debug', '检查现有进程...')

      const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], { stdio: 'ignore' })

      killProc.on('close', (code) => {
        log('debug', code === 0 ? '已清理现有进程' : '未发现现有进程')
        resolve()
      })

      killProc.on('error', () => resolve())

      setTimeout(() => {
        killProc.kill()
        resolve()
      }, 2000)
    })
  }

  onData(callback: AudioCaptureDataCallback): void {
    this.dataCallback = callback
  }

  onError(callback: AudioCaptureErrorCallback): void {
    this.errorCallback = callback
  }

  removeAllListeners(): this {
    this.dataCallback = null
    this.errorCallback = null
    return super.removeAllListeners()
  }

  dispose(): void {
    this.stop()
    this.removeAllListeners()
  }

  getPid(): number | null {
    return this.proc?.pid || null
  }
}
