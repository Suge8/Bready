export type AudioMode = 'system' | 'microphone'

export interface AudioCaptureOptions {
  sampleRate: number
  channels: number
  bitDepth: number
  mode: AudioMode
}

export interface AudioStatus {
  capturing: boolean
  mode: AudioMode
  options: AudioCaptureOptions
}

export interface PermissionStatus {
  granted: boolean
  canRequest: boolean
  message: string
}

export interface SystemPermissions {
  screenRecording: PermissionStatus
  microphone: PermissionStatus
  apiKey: PermissionStatus
  audioDevice: PermissionStatus
}

export interface AnalyzePreparationRequest {
  name: string
  jobDescription: string
  resume?: string
}

export interface AnalyzePreparationResponse {
  success: boolean
  analysis?: {
    matchScore: number
    jobRequirements: string[]
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    systemPrompt: string
  }
  error?: string
}

export interface ExtractFileContentRequest {
  fileName: string
  fileType: string
  base64Data: string
}

export interface ExtractFileContentResponse {
  success: boolean
  content?: string
  error?: string
}

export interface AudioModeChangedPayload {
  mode: AudioMode
  fallback?: boolean
  reason?: string
}

export interface ContextCompressedPayload {
  previousCount: number
  newCount: number
}

export interface AudioResponsePayload {
  data: string
  mimeType: string
}

export interface ShortcutConfig {
  toggleWindow: string
}

export interface SetShortcutResponse {
  success: boolean
  error?: string
}
