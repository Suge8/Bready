/**
 * 渲染进程音频捕获组件
 * 处理实际的 getUserMedia 和 desktopCapturer 调用
 */

import type { AudioCaptureOptions, AudioMode } from '../../../shared/ipc'

const debugAudio = import.meta.env.VITE_DEBUG_AUDIO === '1'
if (debugAudio) {
  console.log('🎵 音频捕获模块开始加载...')
}

interface AudioCaptureConfig {
  mode: AudioMode
  options: AudioCaptureOptions
}

class RendererAudioCapture {
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private isCapturing = false
  private config: AudioCaptureConfig | null = null
  private ipcListenersInitialized = false
  private audioBuffer: Float32Array = new Float32Array(0) // 音频缓存区（cheating-daddy 方式）
  private usingSystemAudioDump = false
  private currentMicrophoneDeviceId: string | null = null // 当前使用的麦克风设备ID
  private preferredMicrophoneDeviceId: string | null = null // 用户手动选择的设备
  private preferredMicrophoneDeviceLabel: string | null = null // 用户手动选择的设备名称
  private currentDeviceLabel: string = '' // 当前设备名称
  private deviceChangeListenerInitialized = false
  private deviceChangeTimeoutId: number | null = null
  private isDeviceSwitching = false
  private hasLoggedSampleRate = false
  private hasLoggedFirstSend = false  // 是否已记录首次发送日志
  private hasLoggedFirstSuccess = false  // 是否已记录首次成功日志
  private isDoubaoMode(): boolean {
    return (this.config?.options?.sampleRate || 0) === 16000
  }

  constructor() {
    this.initializeIpcListeners()
    this.setupDeviceChangeListener()
  }

  /**
   * 初始化IPC事件监听器
   */
  private initializeIpcListeners() {
    if (this.ipcListenersInitialized) {
      if (debugAudio) {
        console.log('🔁 IPC监听器已初始化，跳过')
      }
      return
    }

    if (debugAudio) {
      console.log('🔌 开始初始化IPC音频事件监听器...')
    }

    try {
      if ((window as any).bready?.ipcRenderer?.on) {
        const ipcRenderer = (window as any).bready.ipcRenderer
        if (debugAudio) {
          console.log('✅ Bready IPC renderer 可用，正在注册监听器...')
        }

        // 监听开始音频捕获指令
        ipcRenderer.on('audio-capture-start', async (config: AudioCaptureConfig) => {
          // 无条件日志，用于调试
          console.log('🎤 [渲染进程] 收到音频捕获启动指令:', config?.mode)

          if (debugAudio) {
            console.log('📷 渲染进程收到音频捕获启动指令:', config)
          }
          try {
            const success = await this.start(config)
            if (!success) {
              console.error('渲染进程音频捕获启动失败')
            } else {
              if (debugAudio) {
                console.log('✅ 渲染进程音频捕获启动成功')
              }
            }
          } catch (error) {
            console.error('处理音频捕获启动指令失败:', error)
          }
        })

        // 监听停止音频捕获指令
        ipcRenderer.on('audio-capture-stop', () => {
          if (debugAudio) {
            console.log('📷 渲染进程收到音频捕获停止指令')
          }
          this.stop()
        })

        this.ipcListenersInitialized = true
        if (debugAudio) {
          console.log('✅ IPC音频事件监听器初始化成功！')
          console.log('📡 渲染进程现在可以接收主进程的音频捕获事件')
        }
      } else {
        console.error('❌ Bready IPC renderer 不可用')
        if (debugAudio) {
          console.log('检查 window.bready:', !!(window as any).bready)
          console.log('检查 ipcRenderer:', !!(window as any).bready?.ipcRenderer)
          console.log('检查 ipcRenderer.on:', !!(window as any).bready?.ipcRenderer?.on)
        }
      }
    } catch (error) {
      console.error('设置IPC音频事件监听器失败:', error)
    }
  }

  /**
   * 开始音频捕获
   */
  async start(config: AudioCaptureConfig): Promise<boolean> {
    // 初始化IPC监听器
    this.initializeIpcListeners()

    if (this.isCapturing) {
      if (debugAudio) {
        console.log('🎵 音频捕获已在运行')
      }
      return true
    }

    // 验证配置
    if (debugAudio) {
      console.log('📋 音频捕获配置:', JSON.stringify(config, null, 2))
    }

    // 确保 config 有效
    if (!config || !config.options) {
      console.error('❌ 无效的音频捕获配置:', config)
      // 使用默认配置
      const fallbackMode = config?.mode || 'microphone'
      config = {
        mode: fallbackMode,
        options: {
          sampleRate: 24000,
          channels: 1,
          bitDepth: 16,
          mode: fallbackMode
        }
      }
      if (debugAudio) {
        console.log('📋 使用默认配置:', JSON.stringify(config, null, 2))
      }
    }

    this.config = config
    this.usingSystemAudioDump = false

    try {
      // 无条件日志
      console.log(`🎤 [渲染进程] 启动${config.mode === 'system' ? '系统' : '麦克风'}音频捕获...`)

      if (debugAudio) {
        console.log(`🚀 启动${config.mode === 'system' ? '系统' : '麦克风'}音频捕获...`)
      }

      let stream: MediaStream | null

      if (config.mode === 'system') {
        stream = await this.getSystemAudioStream()
      } else {
        console.log('🎤 [渲染进程] 麦克风模式，获取麦克风流...')
        if (debugAudio) {
          console.log('🎤 用户选择麦克风模式')
        }
        stream = await this.getMicrophoneStream()
        console.log('🎤 [渲染进程] 麦克风流获取结果:', stream ? '成功' : '失败')
      }

      if (!stream) {
        this.isCapturing = true
        if (debugAudio) {
          console.log('✅ 使用 SystemAudioDump，渲染进程不再建立本地音频管道')
        }
        return true
      }

      return this.setupAudioProcessing(stream)
    } catch (error) {
      console.error('❌ 音频捕获启动失败:', error)

      // 如果系统音频失败，自动降级到麦克风
      if (config.mode === 'system') {
        if (debugAudio) {
          console.log('🔄 系统音频失败，自动降级到麦克风模式...')
        }

        // 通知用户已降级
        if ((window as any).bready?.ipcRenderer?.send) {
          (window as any).bready.ipcRenderer.send('audio-mode-fallback', {
            from: 'system',
            to: 'microphone',
            reason: error instanceof Error ? error.message : String(error)
          })
        }

        try {
          const stream = await this.getMicrophoneStream()
          // 更新配置为麦克风模式
          this.config = { ...config, mode: 'microphone' }
          return this.setupAudioProcessing(stream)
        } catch (micError) {
          console.error('❌ 麦克风音频也失败:', micError)
          return false
        }
      }

      // 麦克风模式失败，通知前端
      if ((window as any).bready?.ipcRenderer?.send) {
        (window as any).bready.ipcRenderer.send('audio-mode-fallback', {
          from: 'microphone',
          to: 'none',
          reason: error instanceof Error ? error.message : String(error)
        })
      }

      return false
    }
  }

  /**
   * 获取系统音频流 - 智能混合策略
   */
  private async getSystemAudioStream(): Promise<MediaStream | null> {
    if (debugAudio) {
      console.log('🔊 启动智能系统音频捕获...')
    }

    // 策略1: 优先尝试 SystemAudioDump (cheating-daddy 方式)
    try {
      return await this.trySystemAudioDump()
    } catch (systemDumpError) {
      if (debugAudio) {
        console.log('⚠️ SystemAudioDump 不可用，尝试 desktopCapturer 方式')
        console.log('SystemAudioDump 错误:', systemDumpError)
      }
    }

    // 策略2: 降级到 desktopCapturer (但采用安全方式)
    try {
      return await this.tryDesktopCapturer()
    } catch (desktopCapturerError) {
      if (debugAudio) {
        console.log('⚠️ desktopCapturer 也失败，最终降级到麦克风模式')
        console.log('desktopCapturer 错误:', desktopCapturerError)
      }
      throw new Error('系统音频捕获完全失败，已自动降级到麦克风模式')
    }
  }

  /**
   * 尝试使用 SystemAudioDump (cheating-daddy 方式)
   */
  private async trySystemAudioDump(): Promise<MediaStream | null> {
    if (debugAudio) {
      console.log('🚀 尝试使用 SystemAudioDump...')
    }

    // 检查是否可用 SystemAudioDump
    const available = await this.checkSystemAudioDumpAvailable()
    if (!available) {
      throw new Error('SystemAudioDump 不可用')
    }

    // 启动 SystemAudioDump 进程
    const result = await (window as any).bready?.ipcRenderer?.invoke('start-system-audio-dump')
    if (debugAudio) {
      console.log('🚀 SystemAudioDump 启动结果:', result)
    }

    if (!result || !result.success) {
      throw new Error(result?.error || '启动 SystemAudioDump 进程失败')
    }

    this.usingSystemAudioDump = true
    if (debugAudio) {
      console.log('✅ SystemAudioDump 启动成功, PID:', result.pid)
    }
    return null
  }

  /**
   * 检查 SystemAudioDump 是否可用
   */
  private async checkSystemAudioDumpAvailable(): Promise<boolean> {
    try {
      if (!(window as any).bready?.ipcRenderer?.invoke) {
        return false
      }

      const result = await (window as any).bready.ipcRenderer.invoke('check-system-audio-dump-available')
      return result?.available || false
    } catch (error) {
      if (debugAudio) {
        console.log('检查 SystemAudioDump 可用性失败:', error)
      }
      return false
    }
  }

  /**
   * 尝试使用 desktopCapturer (安全方式)
   */
  private async tryDesktopCapturer(): Promise<MediaStream> {
    if (debugAudio) {
      console.log('🖥️ 尝试使用 desktopCapturer...')
    }

    try {
      // 检查 IPC 是否可用
      if (!(window as any).bready?.ipcRenderer?.invoke) {
        throw new Error('IPC renderer 不可用')
      }

      if (debugAudio) {
        console.log('📡 正在请求桌面音频源...')
      }

      // 使用更安全的超时和错误处理机制
      const sources = await Promise.race([
        (window as any).bready.ipcRenderer.invoke('get-desktop-sources-safe', {
          types: ['screen'],
          fetchWindowIcons: false
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('获取桌面源超时')), 3000)
        )
      ])

      if (debugAudio) {
        console.log('🔍 获取到桌面源:', sources?.length || 0, '个')
      }

      if (!sources || sources.length === 0) {
        throw new Error('无法获取桌面音频源')
      }

      if (debugAudio) {
        console.log('🎵 创建系统音频流...')
      }

      // 使用更安全的 getUserMedia 调用
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sources[0].id,
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
          } as any,
          video: false
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('创建音频流超时')), 3000)
        )
      ])

      if (debugAudio) {
        console.log('✅ desktopCapturer 系统音频流创建成功')
      }
      return stream

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ desktopCapturer 失败:', errorMessage)
      throw error
    }
  }

  /**
   * 获取麦克风音频流 - 智能设备选择
   */
  private async getMicrophoneStream(): Promise<MediaStream> {
    if (debugAudio) {
      console.log('🎤 尝试获取麦克风音频流 (智能设备选择)...')
      console.log('🎤 配置:', {
        sampleRate: this.config?.options?.sampleRate,
        channels: this.config?.options?.channels
      })
    }

    try {
      // 智能选择最佳麦克风设备
      const bestDevice = await this.findBestMicrophoneDevice()

      const targetSampleRate = this.config?.options?.sampleRate || 24000
      const targetChannels = this.config?.options?.channels || 1
      const audioConstraints: MediaTrackConstraints = {
        sampleRate: this.isDoubaoMode() ? { ideal: targetSampleRate } : targetSampleRate,
        channelCount: this.isDoubaoMode() ? { ideal: targetChannels } : targetChannels,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
      const constraints: MediaStreamConstraints = {
        audio: audioConstraints,
        video: false
      }

      // 如果找到了最佳设备，使用指定设备ID
      if (bestDevice) {
        const useExact = this.preferredMicrophoneDeviceId
          && bestDevice.deviceId === this.preferredMicrophoneDeviceId
          ; (constraints.audio as MediaTrackConstraints).deviceId = useExact
            ? { exact: bestDevice.deviceId }
            : { ideal: bestDevice.deviceId }
        if (debugAudio) {
          console.log('🎤 使用设备:', bestDevice.label, `(${bestDevice.deviceId})`)
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (debugAudio) {
        console.log('✅ 麦克风音频流获取成功')
        const audioTracks = stream.getAudioTracks()
        console.log('🎤 音频轨道数量:', audioTracks.length)
        if (audioTracks.length > 0) {
          const track = audioTracks[0]
          const settings = track.getSettings()
          console.log('🎤 音频轨道设置:', settings)
          console.log('🎤 实际使用设备:', track.label)
        }
      }

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length > 0) {
        const track = audioTracks[0]
        const settings = track.getSettings()
        const resolvedDeviceId = settings.deviceId || bestDevice?.deviceId || null
        const resolvedLabel = track.label || bestDevice?.label || ''

        this.currentMicrophoneDeviceId = resolvedDeviceId
        this.currentDeviceLabel = resolvedLabel
        this.notifyDeviceChanged(resolvedDeviceId, resolvedLabel)
      } else if (bestDevice) {
        this.currentMicrophoneDeviceId = bestDevice.deviceId
        this.currentDeviceLabel = bestDevice.label
        this.notifyDeviceChanged(bestDevice.deviceId, bestDevice.label)
      }

      return stream
    } catch (error) {
      console.error('❌ 获取麦克风音频流失败:', error)
      // 抛出更具描述性的错误
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('麦克风权限被拒绝，请在系统设置中授予权限')
        } else if (error.name === 'NotFoundError') {
          throw new Error('未找到麦克风设备')
        } else if (error.name === 'NotReadableError') {
          throw new Error('麦克风设备被占用或不可用')
        }
      }
      throw error
    }
  }

  /**
   * 设置音频处理管道
   */
  private setupAudioProcessing(stream: MediaStream): boolean {
    try {
      this.mediaStream = stream
      this.audioContext = new AudioContext({
        sampleRate: this.config!.options.sampleRate
      })

      const source = this.audioContext.createMediaStreamSource(stream)

      // 创建处理器节点（减小缓冲区大小，降低延迟）
      this.processor = this.audioContext.createScriptProcessor(
        1024, // 从 4096 降低到 1024，减少延迟
        this.config!.options.channels,
        this.config!.options.channels
      )

      const targetSampleRate = this.config!.options.sampleRate
      if (debugAudio && !this.hasLoggedSampleRate) {
        this.hasLoggedSampleRate = true
        console.log('🎛️ AudioContext 采样率:', this.audioContext.sampleRate, '目标采样率:', targetSampleRate)
      }

      this.processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)
        const inputSampleRate = inputBuffer.sampleRate
        const processedData = inputSampleRate === targetSampleRate
          ? inputData
          : this.resampleFloat32(inputData, inputSampleRate, targetSampleRate)

        // 采用 cheating-daddy 的简单方式：直接缓存和发送
        // 但保持我们的 IPC 架构
        const newBuffer = new Float32Array(this.audioBuffer.length + processedData.length)
        newBuffer.set(this.audioBuffer)
        newBuffer.set(processedData, this.audioBuffer.length)
        this.audioBuffer = newBuffer

        // 每 100ms 发送一次（与 cheating-daddy 一致）
        const samplesPerChunk = targetSampleRate * 0.1 // 100ms = 1600 samples

        while (this.audioBuffer.length >= samplesPerChunk) {
          const chunk = this.audioBuffer.slice(0, samplesPerChunk)
          this.audioBuffer = this.audioBuffer.slice(samplesPerChunk)

          // 转换为 Int16 PCM（与 cheating-daddy 一致）
          const pcmData16 = this.convertFloat32ToInt16(chunk)
          const base64Data = this.arrayBufferToBase64(pcmData16.buffer)

          // 首次发送日志
          if (!this.hasLoggedFirstSend) {
            this.hasLoggedFirstSend = true
            console.log('🎤 [渲染进程] 首次发送音频数据到主进程，长度:', base64Data.length)
          }

          // 通过 IPC 发送到主进程（保持我们的架构）
          this.sendOptimizedAudioToMain(base64Data)
        }
      }

      // 连接音频管道
      source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      this.isCapturing = true

      if (debugAudio) {
        console.log(`✅ ${this.config!.mode === 'system' ? '系统' : '麦克风'}音频捕获启动成功`)
      }
      return true

    } catch (error) {
      console.error('❌ 音频处理设置失败:', error)
      return false
    }
  }

  /**
   * 转换 Float32Array 为 Int16 PCM（cheating-daddy 方式）
   */
  private convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      // 改进的缩放以防止剪裁
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16Array
  }

  private resampleFloat32(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (inputRate === outputRate || buffer.length === 0) {
      return buffer
    }
    const ratio = inputRate / outputRate
    const outputLength = Math.floor(buffer.length / ratio)
    const output = new Float32Array(outputLength)

    for (let i = 0; i < outputLength; i++) {
      const pos = i * ratio
      const idx = Math.floor(pos)
      const next = Math.min(idx + 1, buffer.length - 1)
      const weight = pos - idx
      output[i] = buffer[idx] + (buffer[next] - buffer[idx]) * weight
    }

    return output
  }

  /**
   * ArrayBuffer 转 Base64（cheating-daddy 方式）
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * 优化的音频发送方法（cheating-daddy 数据格式 + 我们的 IPC 架构）
   */
  private sendOptimizedAudioToMain(base64Data: string) {
    try {
      if ((window as any).bready?.ipcRenderer?.invoke) {
        const sampleRate = this.config?.options?.sampleRate || 24000;
        // 使用 cheating-daddy 的数据格式，但通过我们的 IPC 发送
        (window as any).bready.ipcRenderer.invoke('send-audio-content-optimized', {
          data: base64Data,
          mimeType: `audio/pcm;rate=${sampleRate}`
        }).then((result: any) => {
          // 首次成功日志
          if (result?.success && !this.hasLoggedFirstSuccess) {
            this.hasLoggedFirstSuccess = true
            console.log('✅ [渲染进程] 首次成功发送音频到主进程')
          }
        }).catch((error: any) => {
          console.error('发送优化音频数据失败:', error)
        })

        // 简单的进度显示（与 cheating-daddy 一致）
        if (debugAudio && typeof process !== 'undefined' && process.stdout?.write) {
          process.stdout.write('.')
        }
      } else {
        console.warn('Bready IPC renderer not available, skipping audio data transmission')
      }
    } catch (error) {
      console.error('发送音频数据失败:', error)
    }
  }

  /**
   * 清理当前音频处理链路
   */
  private teardownAudioProcessing(
    { resetBuffer = true, stopTracks = true }: { resetBuffer?: boolean; stopTracks?: boolean } = {}
  ) {
    if (this.processor) {
      if (debugAudio) {
        console.log('⏹️ 断开音频处理器...')
      }
      this.processor.disconnect()
      this.processor = null
    }

    if (this.audioContext) {
      if (debugAudio) {
        console.log('⏹️ 关闭音频上下文...')
      }
      this.audioContext.close()
      this.audioContext = null
    }

    if (this.mediaStream) {
      if (debugAudio && stopTracks) {
        console.log('⏹️ 停止媒体流轨道...')
        const tracks = this.mediaStream.getTracks()
        console.log(`   共 ${tracks.length} 个轨道`)
      }
      if (stopTracks) {
        this.mediaStream.getTracks().forEach(track => {
          if (debugAudio) {
            console.log(`   停止轨道: ${track.kind} - ${track.label}`)
          }
          track.stop()
        })
      }
      this.mediaStream = null
    }

    if (resetBuffer) {
      this.audioBuffer = new Float32Array(0)
    }
  }

  /**
   * 停止音频捕获
   */
  stop(): void {
    if (debugAudio) {
      console.log('⏹️ 停止渲染进程音频捕获...')
      console.log('📊 当前状态:', {
        isCapturing: this.isCapturing,
        usingSystemAudioDump: this.usingSystemAudioDump,
        hasProcessor: !!this.processor,
        hasAudioContext: !!this.audioContext,
        hasMediaStream: !!this.mediaStream,
        mode: this.config?.mode
      })
    }

    if (this.usingSystemAudioDump) {
      try {
        if ((window as any).bready?.ipcRenderer?.invoke) {
          if (debugAudio) {
            console.log('⏹️ 正在停止 SystemAudioDump...')
          }
          ; (window as any).bready.ipcRenderer.invoke('stop-system-audio-dump')
        }
      } catch (error) {
        console.error('停止 SystemAudioDump 失败:', error)
      }
      this.usingSystemAudioDump = false
    }

    this.teardownAudioProcessing()

    this.isCapturing = false
    this.config = null
    this.hasLoggedSampleRate = false
    this.hasLoggedFirstSend = false
    this.hasLoggedFirstSuccess = false

    if (debugAudio) {
      console.log('✅ 渲染进程音频捕获已停止')
    }
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      capturing: this.isCapturing,
      mode: this.config?.mode || 'unknown',
      config: this.config,
      currentDevice: this.currentDeviceLabel || 'Unknown',
      currentDeviceId: this.currentMicrophoneDeviceId
    }
  }

  /**
   * 设置用户选择的麦克风设备
   */
  async setMicrophoneDevice(deviceId: string): Promise<boolean> {
    if (!deviceId) {
      return false
    }

    this.preferredMicrophoneDeviceId = deviceId

    const device = await this.findMicrophoneDeviceById(deviceId)
    if (this.isDoubaoMode() && device?.label) {
      this.preferredMicrophoneDeviceLabel = device.label
    }

    if (!this.isCapturing || this.config?.mode !== 'microphone') {
      return true
    }

    if (!device) {
      return false
    }

    return await this.switchToDevice(device)
  }

  /**
   * 设置设备变更监听器
   */
  private setupDeviceChangeListener() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return
    }

    if (this.deviceChangeListenerInitialized) {
      return
    }

    navigator.mediaDevices.addEventListener('devicechange', this.scheduleDeviceChangeCheck)
    this.deviceChangeListenerInitialized = true
  }

  private teardownDeviceChangeListener() {
    if (!this.deviceChangeListenerInitialized) {
      return
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', this.scheduleDeviceChangeCheck)
    }
    this.deviceChangeListenerInitialized = false

    if (this.deviceChangeTimeoutId !== null) {
      window.clearTimeout(this.deviceChangeTimeoutId)
      this.deviceChangeTimeoutId = null
    }
  }

  destroy() {
    this.stop()
    this.teardownDeviceChangeListener()
  }

  private scheduleDeviceChangeCheck = () => {
    if (this.deviceChangeTimeoutId !== null) {
      window.clearTimeout(this.deviceChangeTimeoutId)
    }
    this.deviceChangeTimeoutId = window.setTimeout(() => {
      void this.handleDeviceChange()
    }, 250)
  }

  private async handleDeviceChange() {
    this.deviceChangeTimeoutId = null

    if (debugAudio) {
      console.log('🔄 音频设备变更，重新检测可用设备...')
    }

    if (this.isDeviceSwitching) {
      return
    }

    // 如果当前正在使用麦克风模式，尝试自动切换到最佳设备
    if (this.isCapturing && this.config?.mode === 'microphone') {
      this.isDeviceSwitching = true
      try {
        const bestDevice = await this.findBestMicrophoneDevice()
        if (bestDevice && bestDevice.deviceId !== this.currentMicrophoneDeviceId) {
          if (debugAudio) {
            console.log('🔄 检测到更优设备，自动切换:', bestDevice.label)
          }
          await this.switchToDevice(bestDevice)
        }
      } finally {
        this.isDeviceSwitching = false
      }
    }
  }

  /**
   * 枚举并选择最佳麦克风设备
   * 优先级: 内置麦克风 > 外接USB/蓝牙麦克风 > iPhone
   */
  private async findBestMicrophoneDevice(): Promise<MediaDeviceInfo | null> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')

      if (audioInputs.length === 0) {
        if (debugAudio) {
          console.log('❌ 未找到任何音频输入设备')
        }
        return null
      }

      if (this.preferredMicrophoneDeviceId) {
        const preferred = audioInputs.find(device => device.deviceId === this.preferredMicrophoneDeviceId)
        if (preferred) {
          if (debugAudio) {
            console.log('🎯 使用用户选择的麦克风:', preferred.label, `(${preferred.deviceId})`)
          }
          return preferred
        }
        if (this.isDoubaoMode() && this.preferredMicrophoneDeviceLabel) {
          const preferredLabel = this.preferredMicrophoneDeviceLabel.toLowerCase()
          const byLabel = audioInputs.find(device => device.label.toLowerCase() === preferredLabel)
            || audioInputs.find(device => device.label.toLowerCase().includes(preferredLabel))
          if (byLabel) {
            this.preferredMicrophoneDeviceId = byLabel.deviceId
            if (debugAudio) {
              console.log('🎯 设备ID变更，按名称匹配到设备:', byLabel.label, `(${byLabel.deviceId})`)
            }
            return byLabel
          }
        }
      }

      if (debugAudio) {
        console.log('🎤 可用音频设备列表:')
        audioInputs.forEach((device, index) => {
          console.log(`  ${index + 1}. ${device.label || 'Unknown Device'} (${device.deviceId})`)
        })
      }

      const isIphone = (device: MediaDeviceInfo) => {
        const label = device.label.toLowerCase()
        return label.includes('iphone') || label.includes('continuity')
      }

      const isBuiltIn = (device: MediaDeviceInfo) => {
        const label = device.label.toLowerCase()
        return label.includes('built-in') || label.includes('internal')
      }

      // 优先级1: 内置麦克风
      const builtInDevice = audioInputs.find(device => isBuiltIn(device))

      if (builtInDevice) {
        if (debugAudio) {
          console.log('✅ 使用内置麦克风:', builtInDevice.label)
        }
        return builtInDevice
      }

      // 优先级2: 外接 USB 麦克风或蓝牙设备
      const externalDevice = audioInputs.find(device => {
        return (
          !isBuiltIn(device) &&
          !isIphone(device) &&
          device.deviceId !== 'default' &&
          device.deviceId !== 'communications'
        )
      })

      if (externalDevice) {
        if (debugAudio) {
          console.log('✅ 找到外接麦克风:', externalDevice.label)
        }
        return externalDevice
      }

      // 优先级3: iPhone (通过 Continuity Camera)
      const iphoneDevice = audioInputs.find(device => isIphone(device))

      if (iphoneDevice) {
        if (debugAudio) {
          console.log('✅ 使用 iPhone 麦克风:', iphoneDevice.label)
        }
        return iphoneDevice
      }

      // 如果都没找到，返回第一个可用设备
      if (debugAudio) {
        console.log('⚠️ 使用默认音频设备:', audioInputs[0].label)
      }
      return audioInputs[0]

    } catch (error) {
      console.error('❌ 枚举音频设备失败:', error)
      return null
    }
  }

  private async findMicrophoneDeviceById(deviceId: string): Promise<MediaDeviceInfo | null> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return null
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = devices.filter(device => device.kind === 'audioinput')
    return audioInputs.find(device => device.deviceId === deviceId) || null
  }

  /**
   * 切换到指定设备
   */
  private async switchToDevice(device: MediaDeviceInfo): Promise<boolean> {
    try {
      if (debugAudio) {
        console.log('🔄 切换麦克风设备到:', device.label)
      }

      if (!this.config) {
        return false
      }

      const previousStream = this.mediaStream
      const previousDeviceId = this.currentMicrophoneDeviceId
      const previousDeviceLabel = this.currentDeviceLabel

      const targetSampleRate = this.config?.options?.sampleRate || 24000
      const targetChannels = this.config?.options?.channels || 1
      const audioConstraints: MediaTrackConstraints = {
        deviceId: { exact: device.deviceId },
        sampleRate: this.isDoubaoMode() ? { ideal: targetSampleRate } : targetSampleRate,
        channelCount: this.isDoubaoMode() ? { ideal: targetChannels } : targetChannels,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      })

      const audioTracks = stream.getAudioTracks()
      const nextDeviceId = audioTracks.length > 0
        ? (audioTracks[0].getSettings().deviceId || device.deviceId || null)
        : (device.deviceId || null)
      const nextDeviceLabel = audioTracks.length > 0
        ? (audioTracks[0].label || device.label)
        : device.label

      if (nextDeviceId && nextDeviceId !== device.deviceId) {
        stream.getTracks().forEach(track => track.stop())
        return false
      }

      this.teardownAudioProcessing({ stopTracks: false })

      const setupSuccess = this.setupAudioProcessing(stream)
      if (!setupSuccess) {
        stream.getTracks().forEach(track => track.stop())
        if (previousStream) {
          const restored = this.setupAudioProcessing(previousStream)
          if (restored) {
            this.currentMicrophoneDeviceId = previousDeviceId
            this.currentDeviceLabel = previousDeviceLabel
            this.notifyDeviceChanged(previousDeviceId, previousDeviceLabel)
          } else {
            this.isCapturing = false
          }
        } else {
          this.isCapturing = false
        }
        return false
      }

      if (previousStream) {
        previousStream.getTracks().forEach(track => track.stop())
      }

      this.currentMicrophoneDeviceId = nextDeviceId
      this.currentDeviceLabel = nextDeviceLabel
      this.notifyDeviceChanged(nextDeviceId, nextDeviceLabel)

      return true

    } catch (error) {
      console.error('❌ 切换设备失败:', error)
      return false
    }
  }

  private notifyDeviceChanged(deviceId: string | null, deviceLabel: string) {
    if ((window as any).bready?.ipcRenderer?.send) {
      (window as any).bready.ipcRenderer.send('audio-device-changed', {
        deviceId: deviceId || '',
        deviceLabel: deviceLabel
      })
    }
  }
}

const existingCapture = (window as any).rendererAudioCapture
if (existingCapture?.destroy) {
  existingCapture.destroy()
}

// 恢复全局实例创建，但保持延迟初始化策略
const rendererAudioCapture = new RendererAudioCapture()

  // 暴露给全局
  ; (window as any).rendererAudioCapture = rendererAudioCapture

if (debugAudio) {
  console.log('✅ 音频捕获模块加载完成，实例已创建')
}

// 保留延迟创建函数作为备用
const createAudioCaptureInstance = () => {
  if (!(window as any).rendererAudioCapture) {
    if (debugAudio) {
      console.log('🎵 延迟创建音频捕获实例...')
    }
    const rendererAudioCapture = new RendererAudioCapture()
      ; (window as any).rendererAudioCapture = rendererAudioCapture
    if (debugAudio) {
      console.log('✅ 音频捕获实例创建完成')
    }
    return rendererAudioCapture
  }
  return (window as any).rendererAudioCapture
}

export { RendererAudioCapture, rendererAudioCapture, createAudioCaptureInstance }
