import { Router } from 'express'
import { PreparationService } from '../services/database'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const preparations = await PreparationService.getUserPreparations(req.user!.id)
    res.json({ data: preparations })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const preparation = await PreparationService.getById(req.params.id, req.user!.id)
    res.json({ data: preparation })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, job_description, resume, analysis, is_analyzing } = req.body
    const preparation = await PreparationService.create(
      req.user!.id,
      name,
      job_description,
      resume,
      analysis,
      is_analyzing,
    )
    res.json({ data: preparation })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const preparation = await PreparationService.update(req.params.id, req.body, req.user!.id)
    if (!preparation) {
      res.status(400).json({ error: '没有可更新的字段' })
      return
    }
    res.json({ data: preparation })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    await PreparationService.delete(req.params.id, req.user!.id)
    res.json({ data: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/user/:userId', async (req, res) => {
  try {
    const preparations = await PreparationService.getUserPreparations(req.params.userId)
    res.json({ data: preparations })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/item/:id', async (req, res) => {
  try {
    const preparation = await PreparationService.getById(req.params.id)
    res.json({ data: preparation })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/create', async (req, res) => {
  try {
    const { user_id, name, job_description, resume, analysis, is_analyzing } = req.body
    const preparation = await PreparationService.create(
      user_id,
      name,
      job_description,
      resume,
      analysis,
      is_analyzing,
    )
    res.json({ data: preparation })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/item/:id', async (req, res) => {
  try {
    const preparation = await PreparationService.update(req.params.id, req.body)
    if (!preparation) {
      res.status(400).json({ error: '没有可更新的字段' })
      return
    }
    res.json({ data: preparation })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/item/:id', async (req, res) => {
  try {
    await PreparationService.delete(req.params.id)
    res.json({ data: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
