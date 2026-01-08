import { initializeGeminiService, getGeminiService } from './gemini-service'
import { initializeDoubaoService, getDoubaoService } from './doubao-service'
import { log } from './utils/logging'

type AiProvider = 'gemini' | 'doubao'

function resolveProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase()
  if (provider === 'doubao') {
    return 'doubao'
  }
  if (provider !== 'gemini') {
    log('warn', `未知的 AI_PROVIDER: ${provider}，已回退到 gemini`)
  }
  return 'gemini'
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
  if (provider === 'doubao') {
    return initializeDoubaoService(onMessageToRenderer)
  }
  return initializeGeminiService(onMessageToRenderer)
}

export function getAiService() {
  const provider = getActiveProvider()
  if (provider === 'doubao') {
    return getDoubaoService()
  }
  return getGeminiService()
}
