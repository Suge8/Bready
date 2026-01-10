import express from 'express'
import crypto from 'crypto'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env.local' })

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bready',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

async function getSettings(): Promise<Map<string, string>> {
  const result = await pool.query('SELECT key, value, encrypted FROM system_settings')
  const settings = new Map<string, string>()
  for (const row of result.rows) {
    settings.set(row.key, row.encrypted ? decrypt(row.value) : row.value)
  }
  return settings
}

function decrypt(ciphertext: string): string {
  if (!ciphertext) return ''
  try {
    const secret = process.env.JWT_SECRET || ''
    const data = Buffer.from(ciphertext, 'base64')
    const salt = data.subarray(0, 32)
    const iv = data.subarray(32, 48)
    const authTag = data.subarray(48, 64)
    const encrypted = data.subarray(64)
    const key = crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return ''
  }
}

function generateSign(params: Record<string, string>, key: string): string {
  const sortedParams = Object.keys(params)
    .sort()
    .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k])
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return crypto
    .createHash('md5')
    .update(sortedParams + key)
    .digest('hex')
}

async function processPayment(orderNo: string, tradeNo: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const orderResult = await client.query(
      'SELECT * FROM payment_orders WHERE order_no = $1 AND status = $2',
      [orderNo, 'pending'],
    )

    if (orderResult.rows.length === 0) {
      await client.query('COMMIT')
      return
    }

    const order = orderResult.rows[0]

    await client.query(
      "UPDATE payment_orders SET status = 'paid', trade_no = $2, paid_at = NOW() WHERE order_no = $1",
      [orderNo, tradeNo],
    )

    const pkgResult = await client.query('SELECT * FROM membership_packages WHERE id = $1', [
      order.package_id,
    ])

    if (pkgResult.rows.length > 0) {
      const pkg = pkgResult.rows[0]
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + pkg.validity_days)

      await client.query(
        `INSERT INTO purchase_records 
         (user_id, package_id, original_price, actual_price, discount_rate, interview_minutes, expires_at, status, payment_method)
         VALUES ($1, $2, $3, $4, 1.0, $5, $6, 'completed', $7)`,
        [
          order.user_id,
          order.package_id,
          pkg.price,
          order.amount,
          pkg.interview_minutes,
          expiresAt,
          order.payment_provider,
        ],
      )

      await client.query(
        `UPDATE user_profiles SET 
         membership_expires_at = $2,
         remaining_interview_minutes = remaining_interview_minutes + $3,
         total_purchased_minutes = total_purchased_minutes + $3,
         updated_at = NOW()
         WHERE id = $1`,
        [order.user_id, expiresAt, pkg.interview_minutes],
      )
    }

    await client.query('COMMIT')
    console.log(`Payment processed: ${orderNo}`)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Payment processing error:', error)
    throw error
  } finally {
    client.release()
  }
}

app.get('/notify/epay', async (req, res) => {
  try {
    const params = req.query as Record<string, string>
    const settings = await getSettings()
    const key = settings.get('payment_epay_key') || ''

    const receivedSign = params.sign
    const calculatedSign = generateSign(params, key)

    if (receivedSign !== calculatedSign) {
      console.error('EPay signature verification failed')
      return res.send('fail')
    }

    if (params.trade_status === 'TRADE_SUCCESS') {
      await processPayment(params.out_trade_no, params.trade_no)
    }

    res.send('success')
  } catch (error) {
    console.error('EPay notify error:', error)
    res.send('fail')
  }
})

app.post('/notify/wechat', async (req, res) => {
  try {
    const { resource } = req.body
    if (!resource) {
      return res.status(400).json({ code: 'FAIL', message: 'Invalid request' })
    }

    const settings = await getSettings()
    const apiKey = settings.get('payment_wechat_api_key') || ''

    const { ciphertext, nonce, associated_data } = resource
    const keyBuffer = Buffer.from(apiKey)
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, Buffer.from(nonce))
    decipher.setAAD(Buffer.from(associated_data))

    const ciphertextBuffer = Buffer.from(ciphertext, 'base64')
    const authTag = ciphertextBuffer.subarray(-16)
    const encryptedData = ciphertextBuffer.subarray(0, -16)

    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()])
    const data = JSON.parse(decrypted.toString('utf8'))

    if (data.trade_state === 'SUCCESS') {
      await processPayment(data.out_trade_no, data.transaction_id)
    }

    res.json({ code: 'SUCCESS', message: '成功' })
  } catch (error) {
    console.error('Wechat notify error:', error)
    res.status(500).json({ code: 'FAIL', message: 'Internal error' })
  }
})

app.post('/notify/alipay', async (req, res) => {
  try {
    const params = req.body as Record<string, string>
    const settings = await getSettings()
    const publicKey = settings.get('payment_alipay_public_key') || ''

    const sign = params.sign
    if (!sign) {
      return res.send('fail')
    }

    const sortedParams = Object.keys(params)
      .sort()
      .filter((k) => params[k] && k !== 'sign' && k !== 'sign_type')
      .map((k) => `${k}=${params[k]}`)
      .join('&')

    let formattedKey = publicKey
    if (!publicKey.includes('-----BEGIN')) {
      const formatted = publicKey.replace(/(.{64})/g, '$1\n')
      formattedKey = `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`
    }

    const verify = crypto.createVerify('RSA-SHA256')
    verify.update(sortedParams)
    const isValid = verify.verify(formattedKey, sign, 'base64')

    if (!isValid) {
      console.error('Alipay signature verification failed')
      return res.send('fail')
    }

    if (params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED') {
      await processPayment(params.out_trade_no, params.trade_no)
    }

    res.send('success')
  } catch (error) {
    console.error('Alipay notify error:', error)
    res.send('fail')
  }
})

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const PORT = process.env.CALLBACK_PORT || 3002

app.listen(PORT, () => {
  console.log(`Payment callback server running on port ${PORT}`)
})
