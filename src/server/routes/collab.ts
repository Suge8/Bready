import { Router } from 'express'
import { CollabService } from '../services/database'

const router = Router()
const GRACE_PERIOD_MS = 30000

router.post('/start', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) {
      res.status(400).json({ error: 'userId required' })
      return
    }

    const remainingMinutes = await CollabService.getUserRemainingMinutes(userId)
    if (remainingMinutes === null) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    if (remainingMinutes <= 0) {
      res.status(403).json({ error: 'No remaining time' })
      return
    }

    const existingSession = await CollabService.getActiveSession(userId)
    if (existingSession) {
      await endSession(existingSession.id, 'replaced')
    }

    const remainingMs = remainingMinutes * 60 * 1000
    const now = new Date()
    const expiresAt = new Date(now.getTime() + remainingMs)

    const session = await CollabService.createSession(userId, remainingMs, now, expiresAt)

    res.json({
      data: {
        sessionId: session.id,
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

    const session = await CollabService.getSessionById(sessionId)
    if (!session) {
      res.status(404).json({ error: 'Session not found or ended' })
      return
    }

    const now = new Date()
    const startedAt = new Date(session.started_at)
    const elapsedMs = now.getTime() - startedAt.getTime()
    const remainingMs = Math.max(0, session.remaining_ms_at_start - elapsedMs)

    if (remainingMs <= 0) {
      await endSession(sessionId, 'timeout')
      res.json({ data: { timeUp: true, remainingMs: 0 } })
      return
    }

    await CollabService.updateLastSeen(sessionId, now)

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
  const session = await CollabService.getSessionForUpdate(sessionId)
  if (!session) {
    return { alreadyEnded: true }
  }

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

  await CollabService.endSession(sessionId, now, reason, consumedMs)
  await CollabService.deductUserMinutes(session.user_id, consumedMinutes)

  return { sessionId, consumedMinutes, reason }
}

export default router
