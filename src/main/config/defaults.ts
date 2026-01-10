export const DATABASE_DEFAULTS = {
  maxConnections: 10,
  minConnections: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  acquireTimeoutMillis: 20000,
  createRetryIntervalMillis: 1000,
  createTimeoutMillis: 5000,
}

export const MEMORY_DEFAULTS = {
  warningThresholdMB: 150,
  criticalThresholdMB: 200,
  gcTriggerMB: 120,
}

export const STARTUP_DEFAULTS = {
  timeTargetMs: 3000,
}

export const AUDIO_DEFAULTS = {
  bufferSize: 4096,
  noiseThreshold: 0.005,
  enableNoiseGate: true,
  cacheSize: 20,
  cacheTTLMs: 300000,
}

export const NETWORK_DEFAULTS = {
  apiTimeoutMs: 30000,
  connectionTimeoutMs: 5000,
  retryAttempts: 3,
  retryDelayMs: 1000,
}

export const CACHE_DEFAULTS = {
  maxSizeMB: 50,
  ttlMs: 3600000,
  dbQueryCacheSize: 100,
  dbQueryCacheTTLMs: 600000,
}

export const LOG_DEFAULTS = {
  level: 'info' as const,
  fileMaxSize: '10MB',
  fileMaxFiles: 5,
  enableConsoleLogs: true,
}

export const BUILD_DEFAULTS = {
  chunkSizeWarningKB: 500,
  target: 'modern',
  enableCompression: true,
  enableTreeShaking: true,
}

export const SECURITY_DEFAULTS = {
  encryptionAlgorithm: 'aes-256-gcm',
  sessionTimeout: '7d',
  tokenRefreshThreshold: '24h',
}

export const FEATURE_DEFAULTS = {
  enableExperimentalFeatures: false,
  enableBetaAudioProcessing: false,
  enableAdvancedMemoryOptimization: false,
  enableVirtualScrolling: true,
  enableLazyLoading: true,
  enableDebouncedInput: true,
}

export const AI_DEFAULTS = {
  provider: 'doubao' as 'gemini' | 'doubao',
  doubao: {
    chatModel: 'doubao-seed-1-6-flash-250828',
    asrResourceId: 'volc.seedasr.sauc.duration',
  },
}

export const MONITORING_DEFAULTS = {
  enablePerformanceMonitoring: true,
  enableMemoryMonitoring: true,
  enableStartupMetrics: true,
  metricsBufferSize: 100,
}

export const defaults = {
  database: DATABASE_DEFAULTS,
  memory: MEMORY_DEFAULTS,
  startup: STARTUP_DEFAULTS,
  audio: AUDIO_DEFAULTS,
  network: NETWORK_DEFAULTS,
  cache: CACHE_DEFAULTS,
  log: LOG_DEFAULTS,
  build: BUILD_DEFAULTS,
  security: SECURITY_DEFAULTS,
  feature: FEATURE_DEFAULTS,
  ai: AI_DEFAULTS,
  monitoring: MONITORING_DEFAULTS,
}

export default defaults
