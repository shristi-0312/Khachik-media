import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'
import { signToken } from '../auth.js'
import { loginSchema } from '../validation.js'

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } })
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const token = signToken({ sub: user.id, email: user.email })
  res.json({ token, email: user.email })
})

authRouter.get('/me', async (req, res) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const jwt = await import('jsonwebtoken')
    const { config } = await import('../config.js')
    const payload = jwt.default.verify(token, config.jwtSecret) as { email: string }
    res.json({ email: payload.email })
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
})
