import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from './config.js'

export type AuthPayload = { sub: string; email: string }

declare global {
  namespace Express {
    interface Request {
      admin?: AuthPayload
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.token
  const token = bearer || cookieToken

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    req.admin = jwt.verify(token, config.jwtSecret) as AuthPayload
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
