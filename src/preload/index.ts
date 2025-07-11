import { contextBridge, ipcRenderer } from 'electron'

// 自定义API接口
interface BreadyAPI {
  // 窗口管理
  createFloatingWindow: () => Promise<boolean>
  closeFloatingWindow: () => Promise<boolean>
  enterCollaborationMode: () => Promise<boolean>
  exitCollaborationMode: () => Promise<boolean>

  // Gemini API
  initializeGemini: (apiKey: string, customPrompt?: string, profile?: string, language?: string) => Promise<boolean>

  // 音频捕获
  startAudioCapture: () => Promise<boolean>
  stopAudioCapture: () => Promise<boolean>

  // Gemini 连接管理
  reconnectGemini: () => Promise<boolean>
  manualReconnect: () => Promise<boolean>
  disconnectGemini: () => Promise<boolean>

  // 权限管理
  checkPermissions: () => Promise<any>
  checkScreenRecordingPermission: () => Promise<any>
  checkMicrophonePermission: () => Promise<any>
  checkApiKeyStatus: () => Promise<any>
  checkAudioDeviceStatus: () => Promise<any>
  openSystemPreferences: (pane: string) => Promise<boolean>
  testAudioCapture: () => Promise<any>
  requestMicrophonePermission: () => Promise<any>

  // 事件监听
  onStatusUpdate: (callback: (status: string) => void) => () => void
  onTranscriptionUpdate: (callback: (text: string) => void) => () => void
  onAIResponse: (callback: (response: string) => void) => () => void
  onSessionInitializing: (callback: (initializing: boolean) => void) => () => void
  onSessionError: (callback: (error: string) => void) => () => void
  onSessionClosed: (callback: () => void) => () => void
}

// 暴露给渲染进程的API
const breadyAPI: BreadyAPI = {
  // 窗口管理
  createFloatingWindow: () => ipcRenderer.invoke('create-floating-window'),
  closeFloatingWindow: () => ipcRenderer.invoke('close-floating-window'),
  enterCollaborationMode: () => ipcRenderer.invoke('enter-collaboration-mode'),
  exitCollaborationMode: () => ipcRenderer.invoke('exit-collaboration-mode'),

  // Gemini API
  initializeGemini: (apiKey, customPrompt = '', profile = 'interview', language = 'cmn-CN') =>
    ipcRenderer.invoke('initialize-gemini', apiKey, customPrompt, profile, language),

  // 音频捕获
  startAudioCapture: () => ipcRenderer.invoke('start-audio-capture'),
  stopAudioCapture: () => ipcRenderer.invoke('stop-audio-capture'),

  // Gemini 连接管理
  reconnectGemini: () => ipcRenderer.invoke('reconnect-gemini'),
  manualReconnect: () => ipcRenderer.invoke('manual-reconnect'),
  disconnectGemini: () => ipcRenderer.invoke('disconnect-gemini'),

  // 权限管理
  checkPermissions: () => ipcRenderer.invoke('check-permissions'),
  checkScreenRecordingPermission: () => ipcRenderer.invoke('check-screen-recording-permission'),
  checkMicrophonePermission: () => ipcRenderer.invoke('check-microphone-permission'),
  checkApiKeyStatus: () => ipcRenderer.invoke('check-api-key-status'),
  checkAudioDeviceStatus: () => ipcRenderer.invoke('check-audio-device-status'),
  openSystemPreferences: (pane: string) => ipcRenderer.invoke('open-system-preferences', pane),
  testAudioCapture: () => ipcRenderer.invoke('test-audio-capture'),
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
  
  // 事件监听
  onStatusUpdate: (callback) => {
    const listener = (_: any, status: string) => callback(status)
    ipcRenderer.on('update-status', listener)
    return () => ipcRenderer.removeListener('update-status', listener)
  },
  
  onTranscriptionUpdate: (callback) => {
    const listener = (_: any, text: string) => callback(text)
    ipcRenderer.on('transcription-update', listener)
    return () => ipcRenderer.removeListener('transcription-update', listener)
  },
  
  onAIResponse: (callback) => {
    const listener = (_: any, response: string) => callback(response)
    ipcRenderer.on('ai-response', listener)
    return () => ipcRenderer.removeListener('ai-response', listener)
  },
  
  onSessionInitializing: (callback) => {
    const listener = (_: any, initializing: boolean) => callback(initializing)
    ipcRenderer.on('session-initializing', listener)
    return () => ipcRenderer.removeListener('session-initializing', listener)
  },
  
  onSessionError: (callback) => {
    const listener = (_: any, error: string) => callback(error)
    ipcRenderer.on('session-error', listener)
    return () => ipcRenderer.removeListener('session-error', listener)
  },
  
  onSessionClosed: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('session-closed', listener)
    return () => ipcRenderer.removeListener('session-closed', listener)
  }
}

// 使用contextBridge暴露API
contextBridge.exposeInMainWorld('bready', breadyAPI)

// 也可以暴露Node.js环境变量
contextBridge.exposeInMainWorld('env', {
  GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY,
  SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  DEV_MODE: process.env.VITE_DEV_MODE
})
