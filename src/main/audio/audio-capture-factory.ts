import type { AudioCaptureProvider } from './types'
import { SystemAudioDumpProvider } from './macos/system-audio-dump'
import { WasapiLoopbackProvider } from './windows/wasapi-loopback'

let cachedProvider: AudioCaptureProvider | null = null

export function createAudioCaptureProvider(): AudioCaptureProvider {
  if (cachedProvider) {
    return cachedProvider
  }

  if (process.platform === 'darwin') {
    cachedProvider = new SystemAudioDumpProvider()
  } else if (process.platform === 'win32') {
    cachedProvider = new WasapiLoopbackProvider()
  } else {
    throw new Error(`不支持的平台: ${process.platform}`)
  }

  return cachedProvider
}

export function getAudioCaptureProvider(): AudioCaptureProvider | null {
  return cachedProvider
}

export function disposeAudioCaptureProvider(): void {
  if (cachedProvider) {
    cachedProvider.dispose()
    cachedProvider = null
  }
}
