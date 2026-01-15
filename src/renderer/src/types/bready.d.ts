import type {
  AudioStatus,
  SystemPermissions,
  PermissionStatus,
  AnalyzePreparationRequest,
  AnalyzePreparationResponse,
  ExtractFileContentRequest,
  ExtractFileContentResponse,
  AudioModeChangedPayload,
  ContextCompressedPayload,
} from '../../shared/ipc'

export interface PerformanceMetrics {
  timestamp: number
  memory: {
    system: { total: number; free: number; used: number }
    process: NodeJS.MemoryUsage
  }
  cpu: {
    usage: NodeJS.CpuUsage
    loadAverage: number[]
  }
  app: { version: string; uptime: number }
  audio?: {
    chunksProcessed: number
    totalProcessingTime: number
    bufferOverflows: number
    averageProcessingTime: number
  }
}

export interface CrashReport {
  timestamp: number
  type: string
  error: { message: string; stack: string; name: string }
  system: unknown
  app: unknown
}

export interface TestAudioCaptureResult {
  success: boolean
  message: string
  audioData?: number
  silencePercentage?: number
  recommendation?: string
}

export interface BreadyAPI {
  createFloatingWindow: () => Promise<boolean>
  closeFloatingWindow: () => Promise<boolean>
  enterCollaborationMode: () => Promise<boolean>
  exitCollaborationMode: () => Promise<boolean>

  checkAiReady: () => Promise<{ ready: boolean; provider: string; missingFields: string[] }>
  initializeAI: (
    apiKey: string,
    customPrompt?: string,
    profile?: string,
    language?: string,
  ) => Promise<boolean>
  reconnectAI: () => Promise<boolean>
  disconnectAI: () => Promise<boolean>

  initializeGemini: (
    apiKey: string,
    customPrompt?: string,
    profile?: string,
    language?: string,
  ) => Promise<boolean>
  reconnectGemini: () => Promise<boolean>
  disconnectGemini: () => Promise<boolean>

  sendTextMessage: (message: string) => Promise<{ success: boolean; error?: string }>
  startAudioCapture: () => Promise<boolean>
  stopAudioCapture: () => Promise<boolean>
  switchAudioMode: (mode: 'system' | 'microphone') => Promise<boolean>
  getAudioStatus: () => Promise<AudioStatus>
  manualReconnect: () => Promise<boolean>

  checkPermissions: () => Promise<SystemPermissions>
  checkScreenRecordingPermission: () => Promise<PermissionStatus>
  checkMicrophonePermission: () => Promise<PermissionStatus>
  checkApiKeyStatus: () => Promise<PermissionStatus>
  checkAudioDeviceStatus: () => Promise<PermissionStatus>
  openSystemPreferences: (pane: string) => Promise<boolean>
  testAudioCapture: () => Promise<TestAudioCaptureResult>
  requestMicrophonePermission: () => Promise<{ granted: boolean; message: string }>

  onStatusUpdate: (callback: (status: string) => void) => () => void
  onTranscriptionUpdate: (callback: (text: string) => void) => () => void
  onAIResponse: (callback: (response: string) => void) => () => void
  onAIResponseUpdate: (callback: (response: string) => void) => () => void
  onSessionInitializing: (callback: (initializing: boolean) => void) => () => void
  onSessionReady: (callback: () => void) => () => void
  onSessionError: (callback: (error: string) => void) => () => void
  onSessionClosed: (callback: () => void) => () => void
  onAudioModeChanged: (callback: (modeInfo: AudioModeChangedPayload) => void) => () => void
  onAudioDeviceChanged: (
    callback: (data: { deviceId: string; deviceLabel: string }) => void,
  ) => () => void
  onContextCompressed: (callback: (data: ContextCompressedPayload) => void) => () => void
  onAudioStreamInterrupted: (callback: () => void) => () => void
  onAudioStreamRestored: (callback: () => void) => () => void
  onTranscriptionComplete: (callback: (transcription: string) => void) => () => void
  onPerformanceMetrics: (callback: (metrics: PerformanceMetrics) => void) => () => void
  onCrashReport: (callback: (report: CrashReport) => void) => () => void
  analyzePreparation: (data: AnalyzePreparationRequest) => Promise<AnalyzePreparationResponse>
  extractFileContent: (data: ExtractFileContentRequest) => Promise<ExtractFileContentResponse>
}

declare global {
  interface Window {
    bready: BreadyAPI
  }
}

export {}
