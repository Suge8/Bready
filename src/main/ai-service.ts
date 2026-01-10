import { initializeGeminiService, getGeminiService } from './gemini-service'
import { initializeDoubaoService, getDoubaoService } from './doubao-service'
import { getAiConfig, checkAiConfigStatus } from './services/settings-service'
import { log } from './utils/logging'

type AiProvider = 'gemini' | 'doubao'

let cachedProvider: AiProvider | null = null
let configLoaded = false

async function loadProviderFromDb(): Promise<AiProvider> {
  try {
    const config = await getAiConfig()
    const provider = config.provider || 'doubao'
    log('info', '🤖 AI Provider 从数据库加载:', provider)
    return provider
  } catch (error) {
    log('warn', '从数据库加载 AI Provider 失败，使用默认值 doubao:', error)
    return 'doubao'
  }
}

export async function initializeAiProvider(): Promise<AiProvider> {
  if (!configLoaded) {
    cachedProvider = await loadProviderFromDb()
    configLoaded = true
  }
  return cachedProvider!
}

export function getAiProvider(): AiProvider {
  return cachedProvider || 'doubao'
}

export async function refreshAiProvider(): Promise<AiProvider> {
  configLoaded = false
  cachedProvider = null
  return await initializeAiProvider()
}

export async function checkAiReady(): Promise<{
  ready: boolean
  provider: AiProvider | ''
  missingFields: string[]
}> {
  const status = await checkAiConfigStatus()
  return {
    ready: status.configured,
    provider: status.provider,
    missingFields: status.missingFields,
  }
}

export function initializeAiService(onMessageToRenderer: (event: string, data?: any) => void) {
  const provider = getAiProvider()
  if (provider === 'gemini') {
    return initializeGeminiService(onMessageToRenderer)
  }
  return initializeDoubaoService(onMessageToRenderer)
}

export function getAiService() {
  const provider = getAiProvider()
  if (provider === 'gemini') {
    return getGeminiService()
  }
  return getDoubaoService()
}
