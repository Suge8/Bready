/**
 * 渲染进程音频捕获组件
 * 处理实际的 getUserMedia 和 desktopCapturer 调用
 */

console.log('🎵 音频捕获模块开始加载...')

interface AudioCaptureConfig {
  mode: 'system' | 'microphone'
  options: {
    sampleRate: number
    channels: number
    bitDepth: number
  }
}

class RendererAudioCapture {
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private isCapturing = false
  private config: AudioCaptureConfig | null = null
  private ipcListenersInitialized = false
  private audioBuffer: Float32Array = new Float32Array(0) // 音频缓存区（cheating-daddy 方式）

  /**
   * 初始化IPC事件监听器
   */
  private initializeIpcListeners() {
    if (this.ipcListenersInitialized) {
      console.log('🔁 IPC监听器已初始化，跳过')
      return
    }

    console.log('🔌 开始初始化IPC音频事件监听器...')

    try {
      if ((window as any).bready?.ipcRenderer?.on) {
        const ipcRenderer = (window as any).bready.ipcRenderer
        console.log('✅ Bready IPC renderer 可用，正在注册监听器...')

        // 监听开始音频捕获指令
        ipcRenderer.on('audio-capture-start', async (config: AudioCaptureConfig) => {
          console.log('📷 渲染进程收到音频捕获启动指令:', config)
          try {
            const success = await this.start(config)
            if (!success) {
              console.error('渲染进程音频捕获启动失败')
            } else {
              console.log('✅ 渲染进程音频捕获启动成功')
            }
          } catch (error) {
            console.error('处理音频捕获启动指令失败:', error)
          }
        })

        // 监听停止音频捕获指令
        ipcRenderer.on('audio-capture-stop', () => {
          console.log('📷 渲染进程收到音频捕获停止指令')
          this.stop()
        })

        this.ipcListenersInitialized = true
        console.log('✅ IPC音频事件监听器初始化成功！')
        console.log('📡 渲染进程现在可以接收主进程的音频捕获事件')
      } else {
        console.error('❌ Bready IPC renderer 不可用')
        console.log('检查 window.bready:', !!(window as any).bready)
        console.log('检查 ipcRenderer:', !!(window as any).bready?.ipcRenderer)
        console.log('检查 ipcRenderer.on:', !!(window as any).bready?.ipcRenderer?.on)
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
      console.log('🎵 音频捕获已在运行')
      return true
    }

    this.config = config

    try {
      console.log(`🚀 启动${config.mode === 'system' ? '系统' : '麦克风'}音频捕获...`)
      
      let stream: MediaStream
      
      if (config.mode === 'system') {
        stream = await this.getSystemAudioStream()
      } else {
        stream = await this.getMicrophoneStream()
      }

      return this.setupAudioProcessing(stream)
    } catch (error) {
      console.error('❌ 音频捕获启动失败:', error)
      
      // 如果系统音频失败，自动降级到麦克风
      if (config.mode === 'system') {
        console.log('🔄 系统音频失败，自动降级到麦克风模式...')
        
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
      
      return false
    }
  }

  /**
   * 获取系统音频流 - 智能混合策略
   */
  private async getSystemAudioStream(): Promise<MediaStream> {
    console.log('🔊 启动智能系统音频捕获...')
    
    // 策略1: 优先尝试 SystemAudioDump (cheating-daddy 方式)
    try {
      return await this.trySystemAudioDump()
    } catch (systemDumpError) {
      console.log('⚠️ SystemAudioDump 不可用，尝试 desktopCapturer 方式')
      console.log('SystemAudioDump 错误:', systemDumpError)
    }
    
    // 策略2: 降级到 desktopCapturer (但采用安全方式)
    try {
      return await this.tryDesktopCapturer()
    } catch (desktopCapturerError) {
      console.log('⚠️ desktopCapturer 也失败，最终降级到麦克风模式')
      console.log('desktopCapturer 错误:', desktopCapturerError)
      throw new Error('系统音频捕获完全失败，已自动降级到麦克风模式')
    }
  }

  /**
   * 尝试使用 SystemAudioDump (cheating-daddy 方式)
   */
  private async trySystemAudioDump(): Promise<MediaStream> {
    console.log('🚀 尝试使用 SystemAudioDump...')
    
    // 检查是否可用 SystemAudioDump
    const available = await this.checkSystemAudioDumpAvailable()
    if (!available) {
      throw new Error('SystemAudioDump 不可用')
    }
    
    // 启动 SystemAudioDump 进程
    const success = await (window as any).bready?.ipcRenderer?.invoke('start-system-audio-dump')
    if (!success) {
      throw new Error('启动 SystemAudioDump 进程失败')
    }
    
    // 创建虚拟音频流 (SystemAudioDump 通过其他方式传输音频)
    const virtualStream = await this.createVirtualAudioStream()
    console.log('✅ SystemAudioDump 启动成功')
    return virtualStream
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
      console.log('检查 SystemAudioDump 可用性失败:', error)
      return false
    }
  }
  
  /**
   * 创建虚拟音频流 (SystemAudioDump 模式)
   */
  private async createVirtualAudioStream(): Promise<MediaStream> {
    // 创建一个静音的虚拟音频流，实际音频数据通过 SystemAudioDump 进程传输
    const audioContext = new AudioContext({ sampleRate: 24000 })
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    // 设置为静音
    gainNode.gain.value = 0
    oscillator.connect(gainNode)
    
    const destination = audioContext.createMediaStreamDestination()
    gainNode.connect(destination)
    
    oscillator.start()
    
    return destination.stream
  }

  /**
   * 尝试使用 desktopCapturer (安全方式)
   */
  private async tryDesktopCapturer(): Promise<MediaStream> {
    console.log('🖥️ 尝试使用 desktopCapturer...')
    
    try {
      // 检查 IPC 是否可用
      if (!(window as any).bready?.ipcRenderer?.invoke) {
        throw new Error('IPC renderer 不可用')
      }

      console.log('📡 正在请求桌面音频源...')
      
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

      console.log('🔍 获取到桌面源:', sources?.length || 0, '个')
      
      if (!sources || sources.length === 0) {
        throw new Error('无法获取桌面音频源')
      }

      console.log('🎵 创建系统音频流...')
      
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
      
      console.log('✅ desktopCapturer 系统音频流创建成功')
      return stream
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ desktopCapturer 失败:', errorMessage)
      throw error
    }
  }

  /**
   * 获取麦克风音频流
   */
  private async getMicrophoneStream(): Promise<MediaStream> {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: this.config!.options.sampleRate,
        channelCount: this.config!.options.channels,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      },
      video: false
    })
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
      
      this.processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)
        
        // 采用 cheating-daddy 的简单方式：直接缓存和发送
        // 但保持我们的 IPC 架构
        const newBuffer = new Float32Array(this.audioBuffer.length + inputData.length)
        newBuffer.set(this.audioBuffer)
        newBuffer.set(inputData, this.audioBuffer.length)
        this.audioBuffer = newBuffer
        
        // 每 100ms 发送一次（与 cheating-daddy 一致）
        const samplesPerChunk = this.config!.options.sampleRate * 0.1 // 100ms = 2400 samples
        
        while (this.audioBuffer.length >= samplesPerChunk) {
          const chunk = this.audioBuffer.slice(0, samplesPerChunk)
          this.audioBuffer = this.audioBuffer.slice(samplesPerChunk)
          
          // 转换为 Int16 PCM（与 cheating-daddy 一致）
          const pcmData16 = this.convertFloat32ToInt16(chunk)
          const base64Data = this.arrayBufferToBase64(pcmData16.buffer)
          
          // 通过 IPC 发送到主进程（保持我们的架构）
          this.sendOptimizedAudioToMain(base64Data)
        }
      }

      // 连接音频管道
      source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      this.isCapturing = true
      
      console.log(`✅ ${this.config!.mode === 'system' ? '系统' : '麦克风'}音频捕获启动成功`)
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
        // 使用 cheating-daddy 的数据格式，但通过我们的 IPC 发送
        (window as any).bready.ipcRenderer.invoke('send-audio-content-optimized', {
          data: base64Data,
          mimeType: 'audio/pcm;rate=24000'
        }).catch((error: any) => {
          console.error('发送优化音频数据失败:', error)
        })
        
        // 简单的进度显示（与 cheating-daddy 一致）
        if (typeof process !== 'undefined' && process.stdout?.write) {
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
   * 停止音频捕获
   */
  stop(): void {
    console.log('⏹️ 停止渲染进程音频捕获...')
    
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    
    this.isCapturing = false
    console.log('✅ 渲染进程音频捕获已停止')
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      capturing: this.isCapturing,
      mode: this.config?.mode || 'unknown',
      config: this.config
    }
  }
}

// 恢复全局实例创建，但保持延迟初始化策略
const rendererAudioCapture = new RendererAudioCapture()

// 暴露给全局
;(window as any).rendererAudioCapture = rendererAudioCapture

console.log('✅ 音频捕获模块加载完成，实例已创建')

// 保留延迟创建函数作为备用
const createAudioCaptureInstance = () => {
  if (!(window as any).rendererAudioCapture) {
    console.log('🎵 延迟创建音频捕获实例...')
    const rendererAudioCapture = new RendererAudioCapture()
    ;(window as any).rendererAudioCapture = rendererAudioCapture
    console.log('✅ 音频捕获实例创建完成')
    return rendererAudioCapture
  }
  return (window as any).rendererAudioCapture
}

export { RendererAudioCapture, rendererAudioCapture, createAudioCaptureInstance }