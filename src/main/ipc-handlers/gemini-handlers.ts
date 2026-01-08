import { ipcMain } from 'electron'
import { getAiProvider, getAiService, initializeAiService } from '../ai-service'
import type { AnalyzePreparationRequest, ExtractFileContentRequest } from '../../shared/ipc'

// 初始化 AI 会话
ipcMain.handle('initialize-ai', async (event, apiKey: string, customPrompt = '', profile = 'interview', language = 'cmn-CN') => {
  const provider = getAiProvider()
  console.log(`📥 收到 initialize-${provider} 请求，参数:`, {
    apiKeyLength: apiKey?.length || 0,
    customPromptLength: customPrompt?.length || 0,
    profile,
    language
  })

  const sender = event.sender
  let service = getAiService()

  if (!service) {
    console.log('🆕 创建新的 AI 服务实例')
    service = initializeAiService((eventName, data) => {
      sender.send(eventName, data)
    })
  } else {
    console.log('♻️ 复用已有的 AI 服务实例')
  }

  const result = await service.initializeSession(apiKey, customPrompt, profile, language)
  console.log(`📊 ${provider} 会话初始化结果:`, result)
  return result
})

// 重连 AI 会话
ipcMain.handle('reconnect-ai', async () => {
  console.log('收到重连请求')
  const service = getAiService()
  if (service) {
    return await service.reconnect()
  }
  return false
})

// 断开 AI 会话
ipcMain.handle('disconnect-ai', () => {
  const service = getAiService()
  if (service) {
    return service.disconnect()
  }
  return false
})

// 发送文本消息
ipcMain.handle('send-text-message', async (event, message: string) => {
  void event
  console.log('📤 收到要发送给 AI 的文本:', message)

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    console.error('❌ 无效的消息内容')
    return { success: false, error: '无效的消息内容' }
  }

  const service = getAiService()
  if (service) {
    return await service.generateTextResponse(message.trim())
  }
  return { success: false, error: 'AI 服务未初始化' }
})

// 手动重连
ipcMain.handle('manual-reconnect', async () => {
  console.log('收到手动重连请求')
  const service = getAiService()
  if (service) {
    return await service.manualReconnect()
  }
  return false
})

// 优化的音频内容发送处理器
let audioContentCount = 0
let micHasSpeech = false  // 麦克风模式：是否检测到语音
let micLastNonSilentAt = 0  // 麦克风模式：最后非静音时间

// RMS 能量检测的滑动窗口
const rmsHistory: number[] = []
const RMS_WINDOW_SIZE = 10  // 保留最近 10 个 RMS 值（约 1 秒）
const MIN_RMS_FOR_SPEECH = 100  // 最低 RMS 阈值，低于这个值肯定是静音

// 计算音频块的 RMS 值
function calculateRMSFromBase64(base64Data: string): number {
  try {
    const buffer = Buffer.from(base64Data, 'base64')
    const sampleCount = Math.floor(buffer.length / 2)
    if (sampleCount === 0) return 0

    const view = new Int16Array(buffer.buffer, buffer.byteOffset, sampleCount)
    let sumOfSquares = 0
    const stride = 4  // 采样以提高性能

    for (let i = 0; i < sampleCount; i += stride) {
      sumOfSquares += view[i] * view[i]
    }

    return Math.sqrt(sumOfSquares / (sampleCount / stride))
  } catch {
    return 0
  }
}

// 判断是否停止说话（基于 RMS 能量的动态检测）
function isLikelySpeechEnded(rms: number): boolean {
  // 更新 RMS 历史记录
  rmsHistory.push(rms)
  if (rmsHistory.length > RMS_WINDOW_SIZE) {
    rmsHistory.shift()
  }

  // 需要足够的历史数据
  if (rmsHistory.length < 3) {
    return false
  }

  // 计算平均 RMS
  const avgRms = rmsHistory.reduce((a, b) => a + b, 0) / rmsHistory.length

  // 如果平均 RMS 太低，说明一直没有语音，不触发结束
  if (avgRms < MIN_RMS_FOR_SPEECH) {
    return false
  }

  // 如果当前 RMS 低于平均值的 30%，判断为停止说话
  return rms < avgRms * 0.3
}

try {
  ipcMain.handle('send-audio-content-optimized', async (event, { data, mimeType }) => {
    void event
    try {
      audioContentCount++

      // 首次或每 50 次打印日志
      if (audioContentCount === 1 || audioContentCount % 50 === 0) {
        console.log(`📥 [主进程] 收到渲染进程音频数据 #${audioContentCount}, 长度:`, data?.length || 0)
      }

      if (!data || typeof data !== 'string') {
        return { success: false, error: '无效的音频数据' }
      }

      const provider = getAiProvider()
      const service = getAiService()
      if (!service) {
        return { success: false, error: 'AI 服务未初始化' }
      }

      // bigmodel_async 模式：服务端 VAD 自动判停，不需要客户端静音检测
      // 检查会话状态（豆包和 Gemini 都需要）
      if (!service.isSessionReady()) {
        return { success: false, error: '没有活跃的 AI 会话' }
      }

      service.sendAudioToGemini(data, mimeType)

      if (process.env.DEBUG_AUDIO && process.stdout?.write) {
        process.stdout.write('.')
      }

      return { success: true }
    } catch (error) {
      console.error('发送优化音频内容失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
} catch (error) {
  console.error('注册 send-audio-content-optimized 处理器失败:', error)
}

// AI 分析相关的 IPC 处理器
ipcMain.handle('analyze-preparation', async (event, preparationData: AnalyzePreparationRequest) => {
  void event
  console.log('收到AI分析请求:', preparationData)
  const service = getAiService()
  if (!service) {
    return { success: false, error: 'AI 服务未初始化' }
  }
  return await service.analyzePreparation(preparationData)
})

// 文件内容提取 IPC 处理器
ipcMain.handle('extract-file-content', async (event, fileData: ExtractFileContentRequest) => {
  void event
  console.log('收到文件内容提取请求:', fileData.fileName, fileData.fileType)
  const service = getAiService()
  if (!service) {
    return { success: false, error: 'AI 服务未初始化' }
  }
  return await service.extractFileContent(fileData)
})

export { }
