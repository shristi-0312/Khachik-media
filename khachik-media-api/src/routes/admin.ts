import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { prisma } from '../db.js'
import { createPresignedUpload } from '../s3.js'
import { serializeProject } from '../serialize.js'
import { CATEGORY_DB_MAP, SLOT_DB_MAP } from '../types.js'
import { presignSchema, projectBodySchema, projectPatchSchema } from '../validation.js'

export const adminRouter = Router()
adminRouter.use(requireAuth)

adminRouter.get('/projects', async (_req, res) => {
  const projects = await prisma.project.findMany({
    include: { gallery: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  res.json(projects.map(serializeProject))
})

adminRouter.get('/projects/:id', async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { gallery: true },
  })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.json(serializeProject(project))
})

adminRouter.post('/projects', async (req, res) => {
  const parsed = projectBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const data = parsed.data
  const existing = await prisma.project.findUnique({ where: { slug: data.slug } })
  if (existing) {
    res.status(409).json({ error: 'Slug already exists' })
    return
  }

  const maxSort = await prisma.project.aggregate({ _max: { sortOrder: true } })
  const project = await prisma.project.create({
    data: {
      slug: data.slug,
      title: data.title,
      date: data.date,
      year: data.year,
      client: data.client,
      service: data.service,
      category: CATEGORY_DB_MAP[data.category],
      description: data.description,
      coverUrl: data.coverUrl ?? null,
      coverType: data.coverType ?? null,
      heroUrl: data.heroUrl ?? null,
      heroType: data.heroType ?? null,
      published: data.published ?? false,
      sortOrder: data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      gallery: data.gallery
        ? {
            create: data.gallery.map((item, index) => ({
              slot: SLOT_DB_MAP[item.slot],
              mediaType: item.mediaType,
              url: item.url,
              sortOrder: index,
            })),
          }
        : undefined,
    },
    include: { gallery: true },
  })

  res.status(201).json(serializeProject(project))
})

adminRouter.patch('/projects/:id', async (req, res) => {
  const parsed = projectPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const existing = await prisma.project.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const data = parsed.data
  if (data.slug && data.slug !== existing.slug) {
    const clash = await prisma.project.findUnique({ where: { slug: data.slug } })
    if (clash) {
      res.status(409).json({ error: 'Slug already exists' })
      return
    }
  }

  const project = await prisma.$transaction(async (tx) => {
    if (data.gallery) {
      await tx.galleryItem.deleteMany({ where: { projectId: existing.id } })
      if (data.gallery.length) {
        await tx.galleryItem.createMany({
          data: data.gallery.map((item, index) => ({
            projectId: existing.id,
            slot: SLOT_DB_MAP[item.slot],
            mediaType: item.mediaType,
            url: item.url,
            sortOrder: index,
          })),
        })
      }
    }

    return tx.project.update({
      where: { id: existing.id },
      data: {
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.date !== undefined ? { date: data.date } : {}),
        ...(data.year !== undefined ? { year: data.year } : {}),
        ...(data.client !== undefined ? { client: data.client } : {}),
        ...(data.service !== undefined ? { service: data.service } : {}),
        ...(data.category !== undefined ? { category: CATEGORY_DB_MAP[data.category] } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl } : {}),
        ...(data.coverType !== undefined ? { coverType: data.coverType } : {}),
        ...(data.heroUrl !== undefined ? { heroUrl: data.heroUrl } : {}),
        ...(data.heroType !== undefined ? { heroType: data.heroType } : {}),
        ...(data.published !== undefined ? { published: data.published } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
      include: { gallery: true },
    })
  })

  res.json(serializeProject(project))
})

adminRouter.delete('/projects/:id', async (req, res) => {
  const existing = await prisma.project.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  await prisma.project.delete({ where: { id: existing.id } })
  res.status(204).send()
})

adminRouter.post('/uploads/presign', async (req, res) => {
  const parsed = presignSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  try {
    const result = await createPresignedUpload(parsed.data)
    res.json(result)
  } catch (err) {
    console.error('presign failed', err)
    res.status(500).json({
      error:
        'Failed to create upload URL. Check S3 bucket, IAM role/credentials, and CLOUDFRONT_URL.',
    })
  }
})
