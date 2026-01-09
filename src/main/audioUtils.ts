import fs from 'fs'
import path from 'path'
import os from 'os'

// Convert raw PCM to WAV format for easier playback and verification
export function pcmToWav(
  pcmBuffer: Buffer,
  outputPath: string,
  sampleRate = 24000,
  channels = 1,
  bitDepth = 16,
): string {
  const byteRate = sampleRate * channels * (bitDepth / 8)
  const blockAlign = channels * (bitDepth / 8)
  const dataSize = pcmBuffer.length

  // Create WAV header
  const header = Buffer.alloc(44)

  // "RIFF" chunk descriptor
  header.write('RIFF', 0)
  header.writeUInt32LE(dataSize + 36, 4) // File size - 8
  header.write('WAVE', 8)

  // "fmt " sub-chunk
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20) // AudioFormat (1 for PCM)
  header.writeUInt16LE(channels, 22) // NumChannels
  header.writeUInt32LE(sampleRate, 24) // SampleRate
  header.writeUInt32LE(byteRate, 28) // ByteRate
  header.writeUInt16LE(blockAlign, 32) // BlockAlign
  header.writeUInt16LE(bitDepth, 34) // BitsPerSample

  // "data" sub-chunk
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40) // Subchunk2Size

  // Combine header and PCM data
  const wavBuffer = Buffer.concat([header, pcmBuffer])

  // Write to file
  fs.writeFileSync(outputPath, wavBuffer)

  return outputPath
}

// Analyze audio buffer for debugging
export function analyzeAudioBuffer(buffer: Buffer, label = 'Audio') {
  const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2)

  let minValue = 32767
  let maxValue = -32768
  let avgValue = 0
  let rmsValue = 0
  let silentSamples = 0

  for (let i = 0; i < int16Array.length; i++) {
    const sample = int16Array[i]
    minValue = Math.min(minValue, sample)
    maxValue = Math.max(maxValue, sample)
    avgValue += sample
    rmsValue += sample * sample

    if (Math.abs(sample) < 100) {
      silentSamples++
    }
  }

  avgValue /= int16Array.length
  rmsValue = Math.sqrt(rmsValue / int16Array.length)

  const silencePercentage = (silentSamples / int16Array.length) * 100

  // 临时恢复音频分析日志用于调试
  if (silencePercentage < 80) {
    console.log(
      `${label} Analysis: Samples: ${int16Array.length}, Silence: ${silencePercentage.toFixed(1)}%, RMS: ${rmsValue.toFixed(2)}`,
    )
  }

  return {
    minValue,
    maxValue,
    avgValue,
    rmsValue,
    silencePercentage,
    sampleCount: int16Array.length,
  }
}

// Save audio buffer with metadata for debugging
export function saveDebugAudio(buffer: Buffer, type: string, timestamp = Date.now()) {
  const homeDir = os.homedir()
  const debugDir = path.join(homeDir, 'bready', 'debug')

  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true })
  }

  const pcmPath = path.join(debugDir, `${type}_${timestamp}.pcm`)
  const wavPath = path.join(debugDir, `${type}_${timestamp}.wav`)
  const metaPath = path.join(debugDir, `${type}_${timestamp}.json`)

  // Save raw PCM
  fs.writeFileSync(pcmPath, buffer)

  // Convert to WAV for easy playback
  pcmToWav(buffer, wavPath)

  // Analyze and save metadata
  const analysis = analyzeAudioBuffer(buffer, type)
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        timestamp,
        type,
        bufferSize: buffer.length,
        analysis,
        format: {
          sampleRate: 24000,
          channels: 1,
          bitDepth: 16,
        },
      },
      null,
      2,
    ),
  )

  // 完全禁用调试音频保存日志以减少刷屏
  // console.log(`🎵 调试音频已保存: ${wavPath}`)

  return { pcmPath, wavPath, metaPath }
}
