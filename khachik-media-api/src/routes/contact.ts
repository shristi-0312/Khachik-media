import { Router } from 'express'
import { sendContactInquiry } from '../email.js'
import { config } from '../config.js'
import { contactSchema } from '../validation.js'

export const contactRouter = Router()

contactRouter.post('/', async (req, res) => {
  const parsed = contactSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid contact details', details: parsed.error.flatten() })
    return
  }

  if (!config.resendApiKey) {
    res.status(503).json({ error: 'Contact email is not configured' })
    return
  }

  try {
    const result = await sendContactInquiry(parsed.data)
    res.status(200).json({ ok: true, id: result.id })
  } catch (err) {
    console.error('Contact email failed:', err)
    res.status(502).json({ error: 'Failed to send inquiry' })
  }
})
