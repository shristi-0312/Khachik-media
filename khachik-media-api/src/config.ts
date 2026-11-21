import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../.env') })

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', 'postgresql://khachik:khachik@localhost:5432/khachik?schema=public'),
  jwtSecret: required('JWT_SECRET', 'dev-only-secret-change-me'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  adminEmail: required('ADMIN_EMAIL', 'admin@khachikmedia.com'),
  adminPassword: required('ADMIN_PASSWORD', 'change-me'),
  awsRegion: process.env.AWS_REGION ?? 'ap-south-1',
  s3Bucket: process.env.S3_BUCKET ?? 'khachik-media-assets',
  cloudfrontUrl: (process.env.CLOUDFRONT_URL ?? '').replace(/\/$/, ''),
  /** Resend API key — required for contact form delivery */
  resendApiKey: (process.env.RESEND_API_KEY ?? '').trim(),
  contactToEmail: (process.env.CONTACT_TO_EMAIL ?? 'contact@khachikmedia.com').trim(),
  /** Must use a Resend-verified domain (e.g. noreply@khachikmedia.com). */
  contactFromEmail: (
    process.env.CONTACT_FROM_EMAIL ?? 'Khachik Media <noreply@khachikmedia.com>'
  ).trim(),
}
