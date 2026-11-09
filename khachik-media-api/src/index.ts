import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { publicProjectsRouter } from './routes/projects.js'

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
        callback(null, true)
        return
      }
      // Reject quietly (no 500) — browser will show a CORS failure instead
      callback(null, false)
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/auth', authRouter)
app.use('/projects', publicProjectsRouter)
app.use('/admin', adminRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(config.port, () => {
  console.log(`Khachik Media API listening on :${config.port}`)
})
