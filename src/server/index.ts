import { config } from 'dotenv'
import { join } from 'path'
import { createServer, Server } from 'http'
import { WebSocketServer } from 'ws'

config({ path: join(process.cwd(), '.env.local') })
config({ path: join(process.cwd(), '.env') })

import app from './app'
import { initializeDatabase, pool } from './services/database'
import { setupWebSocketServer } from './websocket/audio-proxy'

const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10)
const SHUTDOWN_TIMEOUT = 10000

let server: Server | null = null
let wss: WebSocketServer | null = null
let isShuttingDown = false

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log(`\n${signal} received, shutting down gracefully...`)

  const forceExit = setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT)

  try {
    if (wss) {
      wss.clients.forEach((client) => client.terminate())
      wss.close()
    }

    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()))
    }

    await pool.end()

    clearTimeout(forceExit)
    console.log('Graceful shutdown completed')
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    clearTimeout(forceExit)
    process.exit(1)
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

async function startServer() {
  try {
    await initializeDatabase()
    console.log('Database connected')

    server = createServer(app)
    wss = setupWebSocketServer(server)

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
