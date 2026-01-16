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
    console[level === 'error' ? 'error' : 'log'](`[WasapiLoopback]`, ...args)
  }
}

export class WasapiLoopbackProvider extends EventEmitter implements AudioCaptureProvider {
  readonly platform: NodeJS.Platform = 'win32'
  private proc: ChildProcess | null = null
  private dataCallback: AudioCaptureDataCallback | null = null
  private errorCallback: AudioCaptureErrorCallback | null = null

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'win32') return false

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
    const exeName = 'winscap.exe'
    if (app.isPackaged) {
      return path.join(process.resourcesPath, exeName)
    }
    return path.join(__dirname, '../../../assets', exeName)
  }

  async start(_config?: Partial<AudioCaptureConfig>): Promise<AudioCaptureResult> {
    if (process.platform !== 'win32') {
      return { success: false, error: 'WasapiLoopback 仅支持 Windows' }
    }

    const available = await this.isAvailable()
    if (!available) {
      return {
        success: false,
        error:
          'winscap.exe 不可用，请从 https://github.com/quantum5/winscap/releases 下载并放入 assets 目录',
      }
    }

    await this.killExisting()

    const execPath = this.getExecutablePath()
    log('debug', '启动路径:', execPath)

    const spawnOptions = {
      stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
      detached: false,
    }

    this.proc = spawn(execPath, ['2', '48000', '16'], spawnOptions)

    if (!this.proc || !this.proc.pid) {
      this.proc = null
      return { success: false, error: '启动 winscap 进程失败' }
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

      if (errorMsg.includes('device lost') || errorMsg.includes('AUDCLNT_E_')) {
        this.emit('stream-interrupted')
        if (this.errorCallback) {
          this.errorCallback(new Error('Windows 音频设备丢失'))
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

      const killProc = spawn('taskkill', ['/F', '/IM', 'winscap.exe'], { stdio: 'ignore' })

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
