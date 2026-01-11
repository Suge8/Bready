import nodemailer from 'nodemailer'
import { getSetting } from '../routes/settings'

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromName: string
  fromEmail: string
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const [host, port, secure, user, pass, fromName, fromEmail] = await Promise.all([
    getSetting('smtp_host'),
    getSetting('smtp_port'),
    getSetting('smtp_secure'),
    getSetting('smtp_user'),
    getSetting('smtp_pass'),
    getSetting('smtp_from_name'),
    getSetting('smtp_from_email'),
  ])

  return {
    host: host || '',
    port: parseInt(port || '465', 10),
    secure: secure !== 'false',
    user: user || '',
    pass: pass || '',
    fromName: fromName || 'Bready',
    fromEmail: fromEmail || '',
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  const config = await getSmtpConfig()

  if (!config.host || !config.user || !config.pass) {
    return { success: false, error: 'SMTP not configured' }
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail || config.user}>`,
      to,
      subject,
      html,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Email send failed:', error)
    return { success: false, error: error.message }
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  baseUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;background:#000;">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:600;">Bready</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#111;font-size:20px;font-weight:600;">Reset Your Password</h2>
              <p style="margin:0 0 24px;color:#666;font-size:14px;line-height:1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#000;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">
                Reset Password
              </a>
              <p style="margin:24px 0 0;color:#999;font-size:12px;line-height:1.5;">
                This link expires in 30 minutes. If you didn't request this, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#fafafa;border-top:1px solid #eee;">
              <p style="margin:0;color:#999;font-size:11px;text-align:center;">
                &copy; 2026 Bready. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return sendEmail(to, 'Reset Your Password - Bready', html)
}
