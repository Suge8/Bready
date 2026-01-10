import { Router } from 'express'
import { query } from '../services/database'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM preparations WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user!.id],
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await query('SELECT * FROM preparations WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user!.id,
    ])
    res.json({ data: result.rows[0] || null })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, job_description, resume, analysis, is_analyzing } = req.body
    const result = await query(
      `INSERT INTO preparations (user_id, name, job_description, resume, analysis, is_analyzing) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user!.id,
        name,
        job_description,
        resume || null,
        analysis || null,
        is_analyzing || false,
      ],
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const updates = req.body
    const allowedFields = ['name', 'job_description', 'resume', 'analysis', 'is_analyzing']
    const setClause: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`)
        values.push(updates[field])
        paramIndex++
      }
    }

    if (setClause.length === 0) {
      res.status(400).json({ error: '没有可更新的字段' })
      return
    }

    setClause.push('updated_at = NOW()')
    values.push(req.params.id, req.user!.id)

    const result = await query(
      `UPDATE preparations SET ${setClause.join(', ')} 
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values,
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    await query('DELETE FROM preparations WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user!.id,
    ])
    res.json({ data: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/user/:userId', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM preparations WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.params.userId],
    )
    res.json({ data: result.rows })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/item/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM preparations WHERE id = $1', [req.params.id])
    res.json({ data: result.rows[0] || null })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/create', async (req, res) => {
  try {
    const { user_id, name, job_description, resume, analysis, is_analyzing } = req.body
    const result = await query(
      `INSERT INTO preparations (user_id, name, job_description, resume, analysis, is_analyzing) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, name, job_description, resume || null, analysis || null, is_analyzing || false],
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/item/:id', async (req, res) => {
  try {
    const updates = req.body
    const allowedFields = ['name', 'job_description', 'resume', 'analysis', 'is_analyzing']
    const setClause: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`)
        values.push(updates[field])
        paramIndex++
      }
    }

    if (setClause.length === 0) {
      res.status(400).json({ error: '没有可更新的字段' })
      return
    }

    setClause.push('updated_at = NOW()')
    values.push(req.params.id)

    const result = await query(
      `UPDATE preparations SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    )
    res.json({ data: result.rows[0] })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/item/:id', async (req, res) => {
  try {
    await query('DELETE FROM preparations WHERE id = $1', [req.params.id])
    res.json({ data: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
