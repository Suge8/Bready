import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/auth'
import userRoutes from './routes/user'
import membershipRoutes from './routes/membership'
import preparationRoutes from './routes/preparation'
import settingsRoutes from './routes/settings'
import aiRoutes from './routes/ai'
import paymentRoutes from './routes/payment'
import usageRoutes from './routes/usage'

const app = express()

app.use(
  cors({
    origin: ['http://localhost:3000', 'app://'],
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/membership', membershipRoutes)
app.use('/api/preparation', preparationRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/usage', usageRoutes)

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

export default app
