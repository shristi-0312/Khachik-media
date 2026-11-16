import type { MediaSection } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../db.js'
import { isMediaSection } from '../mediaSections.js'
import { serializeMedia } from '../serializeMedia.js'

export const publicMediaRouter = Router()

/** Published media for the public site. Optional ?section= filter. */
publicMediaRouter.get('/', async (req, res) => {
  const sectionRaw = typeof req.query.section === 'string' ? req.query.section : undefined
  if (sectionRaw && !isMediaSection(sectionRaw)) {
    res.status(400).json({ error: 'Invalid section' })
    return
  }

  const section = sectionRaw as MediaSection | undefined
  const items = await prisma.mediaItem.findMany({
    where: {
      published: true,
      ...(section ? { section } : {}),
    },
    orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  res.json(items.map(serializeMedia))
})
