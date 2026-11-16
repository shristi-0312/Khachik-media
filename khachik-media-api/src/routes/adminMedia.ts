import type { MediaSection } from '@prisma/client'
import express, { Router } from 'express'
import { requireAuth } from '../auth.js'
import { prisma } from '../db.js'
import { isMediaSection, type MediaSectionId } from '../mediaSections.js'
import { createMediaPresignedUpload, putMediaObject } from '../s3.js'
import { serializeMedia } from '../serializeMedia.js'
import {
  mediaBodySchema,
  mediaPatchSchema,
  mediaPresignSchema,
  mediaReorderSchema,
} from '../validation.js'

export const adminMediaRouter = Router()
adminMediaRouter.use(requireAuth)

adminMediaRouter.get('/media', async (req, res) => {
  const sectionRaw = typeof req.query.section === 'string' ? req.query.section : undefined
  if (sectionRaw && !isMediaSection(sectionRaw)) {
    res.status(400).json({ error: 'Invalid section' })
    return
  }

  const section = sectionRaw as MediaSection | undefined
  const items = await prisma.mediaItem.findMany({
    where: section ? { section } : undefined,
    orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
  })
  res.json(items.map(serializeMedia))
})

adminMediaRouter.post('/media', async (req, res) => {
  const parsed = mediaBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const data = parsed.data
  const maxSort = await prisma.mediaItem.aggregate({
    where: { section: data.section },
    _max: { sortOrder: true },
  })

  const item = await prisma.mediaItem.create({
    data: {
      section: data.section,
      title: data.title,
      dateLabel: data.dateLabel,
      mediaType: data.mediaType,
      url: data.url,
      published: data.published ?? true,
      sortOrder: data.sortOrder ?? (maxSort._max?.sortOrder ?? 0) + 1,
    },
  })

  res.status(201).json(serializeMedia(item))
})

adminMediaRouter.post('/media/reorder', async (req, res) => {
  const parsed = mediaReorderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { section, orderedIds } = parsed.data
  const uniqueIds = new Set(orderedIds)
  if (uniqueIds.size !== orderedIds.length) {
    res.status(400).json({ error: 'orderedIds must be unique' })
    return
  }

  const existing = await prisma.mediaItem.findMany({
    where: { section },
    select: { id: true },
  })
  const existingIds = new Set(existing.map((item) => item.id))
  if (existing.length !== orderedIds.length || orderedIds.some((id) => !existingIds.has(id))) {
    res.status(400).json({ error: 'orderedIds must include every item in this section exactly once' })
    return
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.mediaItem.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    ),
  )

  const items = await prisma.mediaItem.findMany({
    where: { section },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })
  res.json(items.map(serializeMedia))
})

adminMediaRouter.patch('/media/:id', async (req, res) => {
  const parsed = mediaPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const existing = await prisma.mediaItem.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    res.status(404).json({ error: 'Media not found' })
    return
  }

  const data = parsed.data
  const item = await prisma.mediaItem.update({
    where: { id: existing.id },
    data: {
      ...(data.section !== undefined ? { section: data.section } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.dateLabel !== undefined ? { dateLabel: data.dateLabel } : {}),
      ...(data.mediaType !== undefined ? { mediaType: data.mediaType } : {}),
      ...(data.url !== undefined ? { url: data.url } : {}),
      ...(data.published !== undefined ? { published: data.published } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  })

  res.json(serializeMedia(item))
})

adminMediaRouter.delete('/media/:id', async (req, res) => {
  const existing = await prisma.mediaItem.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    res.status(404).json({ error: 'Media not found' })
    return
  }
  await prisma.mediaItem.delete({ where: { id: existing.id } })
  res.status(204).send()
})

adminMediaRouter.post('/uploads/presign-media', async (req, res) => {
  const parsed = mediaPresignSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  try {
    const result = await createMediaPresignedUpload(parsed.data)
    res.json(result)
  } catch (err) {
    console.error('media presign failed', err)
    res.status(500).json({
      error:
        'Failed to create upload URL. Check S3 bucket, IAM credentials, and CLOUDFRONT_URL.',
    })
  }
})

/**
 * Browser → API → S3. Avoids browser↔S3 CORS entirely.
 * Send the raw file body; pass section/filename via query or headers.
 */
adminMediaRouter.post(
  '/uploads/media-file',
  express.raw({ type: '*/*', limit: '2048mb' }),
  async (req, res) => {
    const sectionRaw =
      (typeof req.query.section === 'string' && req.query.section) ||
      (typeof req.headers['x-media-section'] === 'string' ? req.headers['x-media-section'] : '')
    const filename =
      (typeof req.query.filename === 'string' && req.query.filename) ||
      (typeof req.headers['x-filename'] === 'string' ? req.headers['x-filename'] : undefined)
    const contentType =
      (typeof req.headers['content-type'] === 'string' && req.headers['content-type']) ||
      'application/octet-stream'

    if (!sectionRaw || !isMediaSection(sectionRaw)) {
      res.status(400).json({ error: 'Invalid section' })
      return
    }

    const body = req.body
    if (!body || !(body instanceof Buffer) || body.length === 0) {
      res.status(400).json({ error: 'Empty upload body' })
      return
    }

    try {
      const result = await putMediaObject({
        section: sectionRaw as MediaSectionId,
        contentType,
        filename,
        body,
      })
      res.json(result)
    } catch (err) {
      console.error('media proxy upload failed', err)
      res.status(500).json({
        error: 'Failed to upload to S3. Check IAM credentials and S3_BUCKET on the API host.',
      })
    }
  },
)
