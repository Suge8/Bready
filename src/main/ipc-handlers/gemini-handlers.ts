import { ipcMain } from 'electron'
import { getGeminiService, initializeGeminiService } from '../gemini-service'
import type { AnalyzePreparationRequest, ExtractFileContentRequest } from '../../shared/ipc'

// 初始化 Gemini 会话
ipcMain.handle('initialize-gemini', async (event, apiKey: string, customPrompt = '', profile = 'interview', language = 'cmn-CN') => {
  console.log('📥 收到 initialize-gemini 请求，参数:', {
    apiKeyLength: apiKey?.length || 0,
    customPromptLength: customPrompt?.length || 0,
    profile,
    language
  })

  const sender = event.sender
  let service = getGeminiService()
  
  if (!service) {
    console.log('🆕 创建新的 Gemini 服务实例')
    service = initializeGeminiService((eventName, data) => {
      sender.send(eventName, data)
    })
  } else {
    console.log('♻️ 复用已有的 Gemini 服务实例')
  }
  
  return await service.initializeGeminiSession(apiKey, customPrompt, profile, language)
})

// 重连 Gemini 会话
ipcMain.handle('reconnect-gemini', async () => {
  console.log('收到重连请求')
  const service = getGeminiService()
  if (service) {
    return await service.reconnectGemini()
  }
  return false
})

// 断开 Gemini 会话
ipcMain.handle('disconnect-gemini', () => {
  const service = getGeminiService()
  if (service) {
    return service.disconnectGemini()
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

  const service = getGeminiService()
  if (service) {
    return await service.generateTextResponse(message.trim())
  }
  return { success: false, error: 'Gemini 服务未初始化' }
})

// 手动重连
ipcMain.handle('manual-reconnect', async () => {
  console.log('收到手动重连请求')
  const service = getGeminiService()
  if (service) {
    return await service.manualReconnect()
  }
  return false
})

// 优化的音频内容发送处理器
try {
  ipcMain.handle('send-audio-content-optimized', async (event, { data, mimeType }) => {
    void event
    try {
      if (!data || typeof data !== 'string') {
        return { success: false, error: '无效的音频数据' }
      }

      const service = getGeminiService()
      if (!service || !service.isSessionReady()) {
        return { success: false, error: '没有活跃的 Gemini 会话' }
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
  const service = getGeminiService()
  if (!service) {
    return { success: false, error: 'Gemini 服务未初始化' }
  }
  return await service.analyzePreparation(preparationData)
})

// 文件内容提取 IPC 处理器
ipcMain.handle('extract-file-content', async (event, fileData: ExtractFileContentRequest) => {
  void event
  console.log('收到文件内容提取请求:', fileData.fileName, fileData.fileType)
  const service = getGeminiService()
  if (!service) {
    return { success: false, error: 'Gemini 服务未初始化' }
  }
  return await service.extractFileContent(fileData)
})

export {}
