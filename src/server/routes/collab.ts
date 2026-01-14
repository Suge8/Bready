import { Router } from 'express'
import { query } from '../services/database'

const router = Router()
const GRACE_PERIOD_MS = 30000

router.post('/start', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) {
      res.status(400).json({ error: 'userId required' })
      return
    }

    const userResult = await query(
      'SELECT remaining_interview_minutes FROM user_profiles WHERE id = $1 FOR UPDATE',
      [userId],
    )
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const remainingMinutes = userResult.rows[0].remaining_interview_minutes || 0
    if (remainingMinutes <= 0) {
      res.status(403).json({ error: 'No remaining time' })
      return
    }

    const existingSession = await query(
      'SELECT id FROM collab_sessions WHERE user_id = $1 AND ended_at IS NULL',
      [userId],
    )
    if (existingSession.rows.length > 0) {
      await endSession(existingSession.rows[0].id, 'replaced')
    }

    const remainingMs = remainingMinutes * 60 * 1000
    const now = new Date()
    const expiresAt = new Date(now.getTime() + remainingMs)

    const result = await query(
      `INSERT INTO collab_sessions (user_id, remaining_ms_at_start, started_at, expires_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $3) RETURNING *`,
      [userId, remainingMs, now, expiresAt],
    )

    res.json({
      data: {
        sessionId: result.rows[0].id,
        serverNow: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        remainingMs,
      },
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/heartbeat', async (req, res) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId required' })
      return
    }

    const sessionResult = await query(
      'SELECT * FROM collab_sessions WHERE id = $1 AND ended_at IS NULL',
      [sessionId],
    )
    if (sessionResult.rows.length === 0) {
      res.status(404).json({ error: 'Session not found or ended' })
      return
    }

    const session = sessionResult.rows[0]
    const now = new Date()
    const startedAt = new Date(session.started_at)
    const elapsedMs = now.getTime() - startedAt.getTime()
    const remainingMs = Math.max(0, session.remaining_ms_at_start - elapsedMs)

    if (remainingMs <= 0) {
      await endSession(sessionId, 'timeout')
      res.json({ data: { timeUp: true, remainingMs: 0 } })
      return
    }

    await query('UPDATE collab_sessions SET last_seen_at = $2 WHERE id = $1', [sessionId, now])

    const expiresAt = new Date(startedAt.getTime() + session.remaining_ms_at_start)
    res.json({
      data: {
        serverNow: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        remainingMs,
        timeUp: false,
      },
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/end', async (req, res) => {
  try {
    const { sessionId, reason } = req.body
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId required' })
      return
    }

    const result = await endSession(sessionId, reason || 'normal')
    res.json({ data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

async function endSession(sessionId: string, reason: string) {
  const sessionResult = await query(
    'SELECT * FROM collab_sessions WHERE id = $1 AND ended_at IS NULL FOR UPDATE',
    [sessionId],
  )
  if (sessionResult.rows.length === 0) {
    return { alreadyEnded: true }
  }

  const session = sessionResult.rows[0]
  const now = new Date()
  const startedAt = new Date(session.started_at)
  const lastSeenAt = new Date(session.last_seen_at)

  const effectiveEnd =
    reason === 'disconnect'
      ? new Date(Math.min(now.getTime(), lastSeenAt.getTime() + GRACE_PERIOD_MS))
      : now

  const consumedMs = Math.min(
    effectiveEnd.getTime() - startedAt.getTime(),
    session.remaining_ms_at_start,
  )
  const consumedMinutes = Math.ceil(consumedMs / 60000)

  await query(
    `UPDATE collab_sessions SET ended_at = $2, end_reason = $3, consumed_ms = $4 WHERE id = $1`,
    [sessionId, now, reason, consumedMs],
  )

  await query(
    `UPDATE user_profiles SET remaining_interview_minutes = GREATEST(remaining_interview_minutes - $2, 0) WHERE id = $1`,
    [session.user_id, consumedMinutes],
  )

  return { sessionId, consumedMinutes, reason }
}

export default router
