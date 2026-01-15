import crypto from 'crypto'
import { query } from './core'

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-32chars-long-here!!'

const encrypt = (text: string): string => {
  if (!text) return ''
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

const decrypt = (text: string): string => {
  if (!text) return ''
  try {
    const parts = text.split(':')
    if (parts.length !== 3) return ''
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return ''
  }
}

export class SettingsService {
  static async get(key: string): Promise<string> {
    const result = await query('SELECT value, encrypted FROM system_settings WHERE key = $1', [key])
    if (result.rows.length === 0) return ''
    const row = result.rows[0]
    return row.encrypted ? decrypt(row.value || '') : row.value || ''
  }

  static async set(key: string, value: string, encrypted: boolean): Promise<void> {
    const storedValue = encrypted ? encrypt(value) : value
    await query(
      `INSERT INTO system_settings (key, value, encrypted) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = $2, encrypted = $3, updated_at = NOW()`,
      [key, storedValue, encrypted],
    )
  }

  static async getMultiple(keys: string[]): Promise<Record<string, string>> {
    const results = await Promise.all(keys.map((k) => this.get(k)))
    return keys.reduce(
      (acc, key, i) => {
        acc[key] = results[i]
        return acc
      },
      {} as Record<string, string>,
    )
  }

  static async setMultiple(settings: Array<{ key: string; value: string; encrypted: boolean }>) {
    await Promise.all(settings.map((s) => this.set(s.key, s.value, s.encrypted)))
  }
}
