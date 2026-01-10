import { config } from 'dotenv'
import { join } from 'path'
import { createServer } from 'http'

config({ path: join(process.cwd(), '.env.local') })
config({ path: join(process.cwd(), '.env') })

import app from './app'
import { initializeDatabase } from './services/database'
import { setupWebSocketServer } from './websocket/audio-proxy'

const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10)

async function startServer() {
  try {
    await initializeDatabase()
    console.log('Database connected')

    const server = createServer(app)
    setupWebSocketServer(server)

    server.listen(PORT, () => {
      console.log(`API Server running on http://localhost:${PORT}`)
      console.log(`WebSocket: ws://localhost:${PORT}/ws/audio`)
      console.log(`Health check: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
