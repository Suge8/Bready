import { Router } from 'express'
import { UsageService, CollabService } from '../services/database'

const router = Router()

router.post('/start-session', async (req, res) => {
  try {
    const { userId, sessionType, preparationId } = req.body
    const record = await UsageService.startSession(userId, sessionType, preparationId)
    res.json({ data: record })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/end-session', async (req, res) => {
  try {
    const { sessionId, minutesUsed } = req.body
    const session = await UsageService.endSession(sessionId, minutesUsed)

    if (!session) {
      res.status(404).json({ error: '会话不存在' })
      return
    }

    await CollabService.deductUserMinutes(session.user_id, minutesUsed)
    res.json({ data: session })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/records/:userId', async (req, res) => {
  try {
    const records = await UsageService.getUserRecords(req.params.userId)
    res.json({ data: records })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/all-records', async (_req, res) => {
  try {
    const records = await UsageService.getAllRecords()
    res.json({ data: records })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
