import { z } from 'zod'

const mediaType = z.enum(['image', 'video'])
const category = z.enum(['promotional', 'corporate', 'advertisements', 'short-forms'])
const gallerySlot = z.enum(['full', 'pair-1', 'pair-2', 'triple-1', 'triple-2', 'triple-3'])

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const galleryItemSchema = z.object({
  slot: gallerySlot,
  mediaType,
  url: z.string().url(),
})

export const projectBodySchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  title: z.string().min(1),
  date: z.string().min(1),
  year: z.string().min(1),
  client: z.string().min(1),
  service: z.string().min(1),
  category,
  description: z.array(z.string()).default([]),
  coverUrl: z.string().url().nullable().optional(),
  coverType: mediaType.nullable().optional(),
  heroUrl: z.string().url().nullable().optional(),
  heroType: mediaType.nullable().optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  gallery: z.array(galleryItemSchema).optional(),
})

export const projectPatchSchema = projectBodySchema.partial()

export const presignSchema = z.object({
  slug: z.string().min(1),
  contentType: z.string().min(1),
  filename: z.string().optional(),
})
