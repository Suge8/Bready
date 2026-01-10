import type { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/database'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    user_level: string
  }
  token?: string
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    const cookieToken = req.cookies?.session_token

    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken

    if (!token) {
      res.status(401).json({ error: '未提供认证令牌' })
      return
    }

    const user = await AuthService.verifySession(token)
    if (!user) {
      res.status(401).json({ error: '认证令牌无效或已过期' })
      return
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      user_level: user.user_level,
    }
    req.token = token
    next()
  } catch (error) {
    res.status(401).json({ error: '认证失败' })
  }
}

export function adminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: '未认证' })
    return
  }

  const isAdmin =
    req.user.role === 'admin' || req.user.user_level === '管理' || req.user.user_level === '超级'

  if (!isAdmin) {
    res.status(403).json({ error: '需要管理员权限' })
    return
  }

  next()
}
