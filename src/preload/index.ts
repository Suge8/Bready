import { contextBridge, ipcRenderer } from 'electron'
import type {
  AnalyzePreparationRequest,
  AnalyzePreparationResponse,
  AudioMode,
  AudioModeChangedPayload,
  AudioResponsePayload,
  AudioStatus,
  ContextCompressedPayload,
  ExtractFileContentRequest,
  ExtractFileContentResponse,
  PermissionStatus,
  SetShortcutResponse,
  ShortcutConfig,
  SystemPermissions,
} from '../shared/ipc'

// 自定义API接口
interface BreadyAPI {
  // 窗口管理
  createFloatingWindow: () => Promise<boolean>
  closeFloatingWindow: () => Promise<boolean>
  enterCollaborationMode: () => Promise<boolean>
  exitCollaborationMode: () => Promise<boolean>

  // AI API（通用，支持多个渠道）
  checkAiReady: () => Promise<{ ready: boolean; provider: string; missingFields: string[] }>
  initializeAI: (
    apiKey: string,
    customPrompt?: string,
    profile?: string,
    language?: string,
  ) => Promise<boolean>
  reconnectAI: () => Promise<boolean>
  disconnectAI: () => Promise<boolean>

  // 旧方法（保持向后兼容）
  initializeGemini: (
    apiKey: string,
    customPrompt?: string,
    profile?: string,
    language?: string,
  ) => Promise<boolean>
  reconnectGemini: () => Promise<boolean>
  disconnectGemini: () => Promise<boolean>

  sendTextMessage: (message: string) => Promise<{ success: boolean; error?: string }>

  // 音频捕获
  startAudioCapture: () => Promise<boolean>
  stopAudioCapture: () => Promise<boolean>
  switchAudioMode: (mode: AudioMode) => Promise<boolean>
  getAudioStatus: () => Promise<AudioStatus>

  // 连接管理
  manualReconnect: () => Promise<boolean>

  // 权限管理
  checkPermissions: () => Promise<SystemPermissions>
  checkScreenRecordingPermission: () => Promise<PermissionStatus>
  checkMicrophonePermission: () => Promise<PermissionStatus>
  checkApiKeyStatus: () => Promise<PermissionStatus>
  checkAudioDeviceStatus: () => Promise<PermissionStatus>
  openSystemPreferences: (pane: string) => Promise<boolean>
  testAudioCapture: () => Promise<{
    success: boolean
    message: string
    audioData?: number
    silencePercentage?: number
    recommendation?: string
  }>
  requestMicrophonePermission: () => Promise<{ granted: boolean; message: string }>

  // AI 分析
  analyzePreparation: (
    preparationData: AnalyzePreparationRequest,
  ) => Promise<AnalyzePreparationResponse>

  // 文件内容提取
  extractFileContent: (fileData: ExtractFileContentRequest) => Promise<ExtractFileContentResponse>

  // 快捷键管理
  getShortcut: () => Promise<ShortcutConfig>
  setShortcut: (shortcut: string) => Promise<SetShortcutResponse>

  // 事件监听
  onStatusUpdate: (callback: (status: string) => void) => () => void
  onTranscriptionUpdate: (callback: (text: string) => void) => () => void
  onAIResponse: (callback: (response: string) => void) => () => void
  onAIResponseUpdate: (callback: (response: string) => void) => () => void
  onSessionInitializing: (callback: (initializing: boolean) => void) => () => void
  onSessionReady: (callback: () => void) => () => void
  onSessionError: (callback: (error: string) => void) => () => void
  onSessionClosed: (callback: () => void) => () => void
  onAudioModeChanged: (callback: (modeInfo: AudioModeChangedPayload) => void) => () => void
  onContextCompressed: (callback: (data: ContextCompressedPayload) => void) => () => void
  onAudioStreamInterrupted: (callback: () => void) => () => void
  onAudioStreamRestored: (callback: () => void) => () => void
  onTranscriptionComplete: (callback: (transcription: string) => void) => () => void
  onAudioResponse: (callback: (data: AudioResponsePayload) => void) => () => void
  onAudioDeviceChanged: (
    callback: (data: { deviceId: string; deviceLabel: string }) => void,
  ) => () => void
  onPerformanceMetrics: (callback: (metrics: PerformanceMetrics) => void) => () => void
  onCrashReport: (callback: (report: CrashReport) => void) => () => void
}

interface PerformanceMetrics {
  heapUsed: number
  heapTotal: number
  external: number
  rss: number
}

interface CrashReport {
  type: string
  message: string
  stack?: string
  timestamp: number
}

// 暴露给渲染进程的API
const breadyAPI: BreadyAPI = {
  // 窗口管理
  createFloatingWindow: () => ipcRenderer.invoke('create-floating-window'),
  closeFloatingWindow: () => ipcRenderer.invoke('close-floating-window'),
  enterCollaborationMode: () => ipcRenderer.invoke('enter-collaboration-mode'),
  exitCollaborationMode: () => ipcRenderer.invoke('exit-collaboration-mode'),

  // AI API（通用，支持多个渠道）
  checkAiReady: () => ipcRenderer.invoke('check-ai-ready'),
  initializeAI: (apiKey, customPrompt = '', profile = 'interview', language = 'cmn-CN') =>
    ipcRenderer.invoke('initialize-ai', apiKey, customPrompt, profile, language),
  reconnectAI: () => ipcRenderer.invoke('reconnect-ai'),
  disconnectAI: () => ipcRenderer.invoke('disconnect-ai'),

  // 旧方法（保持向后兼容）
  initializeGemini: (apiKey, customPrompt = '', profile = 'interview', language = 'cmn-CN') =>
    ipcRenderer.invoke('initialize-ai', apiKey, customPrompt, profile, language),
  reconnectGemini: () => ipcRenderer.invoke('reconnect-ai'),
  disconnectGemini: () => ipcRenderer.invoke('disconnect-ai'),

  sendTextMessage: (message: string) => ipcRenderer.invoke('send-text-message', message),

  // 音频捕获
  startAudioCapture: () => ipcRenderer.invoke('start-audio-capture'),
  stopAudioCapture: () => ipcRenderer.invoke('stop-audio-capture'),
  switchAudioMode: (mode: 'system' | 'microphone') => ipcRenderer.invoke('switch-audio-mode', mode),
  getAudioStatus: () => ipcRenderer.invoke('get-audio-status'),

  // 连接管理
  manualReconnect: () => ipcRenderer.invoke('manual-reconnect'),

  // 权限管理
  checkPermissions: () => ipcRenderer.invoke('check-permissions'),
  checkScreenRecordingPermission: () => ipcRenderer.invoke('check-screen-recording-permission'),
  checkMicrophonePermission: () => ipcRenderer.invoke('check-microphone-permission'),
  checkApiKeyStatus: () => ipcRenderer.invoke('check-api-key-status'),
  checkAudioDeviceStatus: () => ipcRenderer.invoke('check-audio-device-status'),
  openSystemPreferences: (pane: string) => ipcRenderer.invoke('open-system-preferences', pane),
  testAudioCapture: () => ipcRenderer.invoke('test-audio-capture'),
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),

  // AI 分析
  analyzePreparation: (preparationData) =>
    ipcRenderer.invoke('analyze-preparation', preparationData),

  // 文件内容提取
  extractFileContent: (fileData) => ipcRenderer.invoke('extract-file-content', fileData),

  getShortcut: () => ipcRenderer.invoke('shortcut:get'),
  setShortcut: (shortcut: string) => ipcRenderer.invoke('shortcut:set', shortcut),

  onStatusUpdate: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, status: string) => callback(status)
    ipcRenderer.on('update-status', listener)
    return () => ipcRenderer.removeListener('update-status', listener)
  },

  onTranscriptionUpdate: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, text: string) => callback(text)
    ipcRenderer.on('transcription-update', listener)
    return () => ipcRenderer.removeListener('transcription-update', listener)
  },

  onAIResponse: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, response: string) => callback(response)
    ipcRenderer.on('ai-response', listener)
    return () => ipcRenderer.removeListener('ai-response', listener)
  },

  onAIResponseUpdate: (callback: (response: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, response: string) => callback(response)
    ipcRenderer.on('ai-response-update', listener)
    return () => ipcRenderer.removeListener('ai-response-update', listener)
  },

  onSessionInitializing: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, initializing: boolean) =>
      callback(initializing)
    ipcRenderer.on('session-initializing', listener)
    return () => ipcRenderer.removeListener('session-initializing', listener)
  },

  onSessionReady: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('session-ready', listener)
    return () => ipcRenderer.removeListener('session-ready', listener)
  },

  onSessionError: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on('session-error', listener)
    return () => ipcRenderer.removeListener('session-error', listener)
  },

  onSessionClosed: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('session-closed', listener)
    return () => ipcRenderer.removeListener('session-closed', listener)
  },

  onAudioModeChanged: (callback: (modeInfo: AudioModeChangedPayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, modeInfo: AudioModeChangedPayload) =>
      callback(modeInfo)
    ipcRenderer.on('audio-mode-changed', listener)
    return () => ipcRenderer.removeListener('audio-mode-changed', listener)
  },

  onContextCompressed: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, data: ContextCompressedPayload) =>
      callback(data)
    ipcRenderer.on('context-compressed', listener)
    return () => ipcRenderer.removeListener('context-compressed', listener)
  },

  onAudioStreamInterrupted: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('audio-stream-interrupted', listener)
    return () => ipcRenderer.removeListener('audio-stream-interrupted', listener)
  },

  onAudioStreamRestored: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('audio-stream-restored', listener)
    return () => ipcRenderer.removeListener('audio-stream-restored', listener)
  },

  onTranscriptionComplete: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, transcription: string) =>
      callback(transcription)
    ipcRenderer.on('transcription-complete', listener)
    return () => ipcRenderer.removeListener('transcription-complete', listener)
  },

  onAudioResponse: (callback: (data: AudioResponsePayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: AudioResponsePayload) =>
      callback(data)
    ipcRenderer.on('audio-response', listener)
    return () => ipcRenderer.removeListener('audio-response', listener)
  },

  onAudioDeviceChanged: (callback: (data: { deviceId: string; deviceLabel: string }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { deviceId: string; deviceLabel: string },
    ) => callback(data)
    ipcRenderer.on('audio-device-changed', listener)
    return () => ipcRenderer.removeListener('audio-device-changed', listener)
  },

  onPerformanceMetrics: (callback: (metrics: PerformanceMetrics) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, metrics: PerformanceMetrics) =>
      callback(metrics)
    ipcRenderer.on('performance-metrics', listener)
    return () => ipcRenderer.removeListener('performance-metrics', listener)
  },

  onCrashReport: (callback: (report: CrashReport) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, report: CrashReport) => callback(report)
    ipcRenderer.on('crash-report', listener)
    return () => ipcRenderer.removeListener('crash-report', listener)
  },
}

// 使用contextBridge暴露API
contextBridge.exposeInMainWorld('bready', {
  ...breadyAPI,
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
    send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (...args: unknown[]) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
        listener(...args)
      ipcRenderer.on(channel, subscription)
      return () => ipcRenderer.removeListener(channel, subscription)
    },
    removeListener: (channel: string, listener: (...args: unknown[]) => void) =>
      ipcRenderer.removeListener(channel, listener),
  },
})
