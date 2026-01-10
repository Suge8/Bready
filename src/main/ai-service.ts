import { initializeGeminiService, getGeminiService } from './gemini-service'
import { initializeDoubaoService, getDoubaoService } from './doubao-service'
import { log } from './utils/logging'

type AiProvider = 'gemini' | 'doubao'

function resolveProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER || 'doubao').toLowerCase()
  console.log('🤖 AI Provider 选择:', {
    env: process.env.AI_PROVIDER,
    resolved: provider,
  })
  if (provider === 'gemini') {
    return 'gemini'
  }
  if (provider !== 'doubao') {
    log('warn', `未知的 AI_PROVIDER: ${provider}，已回退到 doubao`)
  }
  return 'doubao'
}

let cachedProvider: AiProvider | null = null

function getActiveProvider(): AiProvider {
  if (!cachedProvider) {
    cachedProvider = resolveProvider()
  }
  return cachedProvider
}

export function getAiProvider(): AiProvider {
  return getActiveProvider()
}

export function initializeAiService(onMessageToRenderer: (event: string, data?: any) => void) {
  const provider = getActiveProvider()
  if (provider === 'gemini') {
    return initializeGeminiService(onMessageToRenderer)
  }
  return initializeDoubaoService(onMessageToRenderer)
}

export function getAiService() {
  const provider = getActiveProvider()
  if (provider === 'gemini') {
    return getGeminiService()
  }
  return getDoubaoService()
}
