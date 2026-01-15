import { Pool } from 'pg'

const debugDb = process.env.DEBUG_DB === '1'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bready',
  user: process.env.DB_USER || process.env.USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
}

export const pool = new Pool(dbConfig)

pool.on('error', (err) => {
  console.error('Database pool error:', err)
})

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    if (debugDb) console.log('Database connection successful')
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    await testConnection()
    if (debugDb) console.log('Database initialized')
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}
