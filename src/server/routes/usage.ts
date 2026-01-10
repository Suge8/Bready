import { Router } from 'express'
import { query } from '../services/database'

const router = Router()

router.post('/start-session', async (req, res) => {
  try {
    const { userId, sessionType, preparationId } = req.body
    const result = await query(
      `INSERT INTO interview_usage_records (user_id, preparation_id, session_type, minutes_used, started_at) 
       VALUES ($1, $2, $3, 0, NOW()) RETURNING *`,
      [userId, preparationId || null, sessionType],
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/end-session', async (req, res) => {
  try {
    const { sessionId, minutesUsed } = req.body
    const sessionResult = await query(
      'UPDATE interview_usage_records SET minutes_used = $2, ended_at = NOW() WHERE id = $1 RETURNING *',
      [sessionId, minutesUsed],
    )

    if (sessionResult.rows.length === 0) {
      res.status(404).json({ error: '会话不存在' })
      return
    }

    const session = sessionResult.rows[0]
    await query(
      'UPDATE user_profiles SET remaining_interview_minutes = GREATEST(remaining_interview_minutes - $2, 0), updated_at = NOW() WHERE id = $1',
      [session.user_id, minutesUsed],
    )

    res.json({ data: session })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/records/:userId', async (req, res) => {
  try {
    const result = await query(
      `SELECT iur.*, p.name as preparation_name 
       FROM interview_usage_records iur 
       LEFT JOIN preparations p ON iur.preparation_id = p.id 
       WHERE iur.user_id = $1 
       ORDER BY iur.created_at DESC`,
      [req.params.userId],
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/all-records', async (_req, res) => {
  try {
    const result = await query(
      `SELECT iur.*, 
              up.full_name, up.username, up.email, up.avatar_url,
              p.name as preparation_name 
       FROM interview_usage_records iur 
       LEFT JOIN user_profiles up ON iur.user_id = up.id
       LEFT JOIN preparations p ON iur.preparation_id = p.id 
       ORDER BY iur.created_at DESC
       LIMIT 500`,
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
