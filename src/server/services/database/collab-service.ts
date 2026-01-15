import { query } from './core'
import type { CollabSession, UsageRecord } from './types'

export class CollabService {
  static async getUserRemainingMinutes(userId: string): Promise<number | null> {
    const result = await query(
      'SELECT remaining_interview_minutes FROM user_profiles WHERE id = $1 FOR UPDATE',
      [userId],
    )
    return result.rows.length > 0 ? result.rows[0].remaining_interview_minutes || 0 : null
  }

  static async getActiveSession(userId: string): Promise<{ id: string } | null> {
    const result = await query(
      'SELECT id FROM collab_sessions WHERE user_id = $1 AND ended_at IS NULL',
      [userId],
    )
    return result.rows[0] || null
  }

  static async createSession(
    userId: string,
    remainingMs: number,
    startedAt: Date,
    expiresAt: Date,
  ): Promise<CollabSession> {
    const result = await query(
      `INSERT INTO collab_sessions (user_id, remaining_ms_at_start, started_at, expires_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $3) RETURNING *`,
      [userId, remainingMs, startedAt, expiresAt],
    )
    return result.rows[0]
  }

  static async getSessionById(sessionId: string): Promise<CollabSession | null> {
    const result = await query('SELECT * FROM collab_sessions WHERE id = $1 AND ended_at IS NULL', [
      sessionId,
    ])
    return result.rows[0] || null
  }

  static async getSessionForUpdate(sessionId: string): Promise<CollabSession | null> {
    const result = await query(
      'SELECT * FROM collab_sessions WHERE id = $1 AND ended_at IS NULL FOR UPDATE',
      [sessionId],
    )
    return result.rows[0] || null
  }

  static async updateLastSeen(sessionId: string, now: Date): Promise<void> {
    await query('UPDATE collab_sessions SET last_seen_at = $2 WHERE id = $1', [sessionId, now])
  }

  static async endSession(
    sessionId: string,
    endedAt: Date,
    reason: string,
    consumedMs: number,
  ): Promise<void> {
    await query(
      `UPDATE collab_sessions SET ended_at = $2, end_reason = $3, consumed_ms = $4 WHERE id = $1`,
      [sessionId, endedAt, reason, consumedMs],
    )
  }

  static async deductUserMinutes(userId: string, minutes: number): Promise<void> {
    await query(
      `UPDATE user_profiles SET remaining_interview_minutes = GREATEST(remaining_interview_minutes - $2, 0) WHERE id = $1`,
      [userId, minutes],
    )
  }
}

export class UsageService {
  static async startSession(
    userId: string,
    sessionType: string,
    preparationId?: string,
  ): Promise<UsageRecord> {
    const result = await query(
      `INSERT INTO interview_usage_records (user_id, preparation_id, session_type, minutes_used, started_at) 
       VALUES ($1, $2, $3, 0, NOW()) RETURNING *`,
      [userId, preparationId || null, sessionType],
    )
    return result.rows[0]
  }

  static async endSession(sessionId: string, minutesUsed: number): Promise<UsageRecord | null> {
    const result = await query(
      'UPDATE interview_usage_records SET minutes_used = $2, ended_at = NOW() WHERE id = $1 RETURNING *',
      [sessionId, minutesUsed],
    )
    return result.rows[0] || null
  }

  static async getUserRecords(userId: string): Promise<UsageRecord[]> {
    const result = await query(
      `SELECT iur.*, p.name as preparation_name 
       FROM interview_usage_records iur 
       LEFT JOIN preparations p ON iur.preparation_id = p.id 
       WHERE iur.user_id = $1 
       ORDER BY iur.created_at DESC`,
      [userId],
    )
    return result.rows
  }

  static async getAllRecords(limit = 500): Promise<UsageRecord[]> {
    const result = await query(
      `SELECT iur.*, 
              up.full_name, up.username, up.email, up.avatar_url,
              p.name as preparation_name 
       FROM interview_usage_records iur 
       LEFT JOIN user_profiles up ON iur.user_id = up.id
       LEFT JOIN preparations p ON iur.preparation_id = p.id 
       ORDER BY iur.created_at DESC
       LIMIT $1`,
      [limit],
    )
    return result.rows
  }
}
