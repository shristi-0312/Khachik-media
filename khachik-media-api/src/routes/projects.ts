import { Router } from 'express'
import { prisma } from '../db.js'
import { serializeProject } from '../serialize.js'

export const publicProjectsRouter = Router()

publicProjectsRouter.get('/', async (_req, res) => {
  const projects = await prisma.project.findMany({
    where: { published: true },
    include: { gallery: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  res.json(projects.map(serializeProject))
})

publicProjectsRouter.get('/:slug', async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { slug: req.params.slug, published: true },
    include: { gallery: true },
  })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.json(serializeProject(project))
})
