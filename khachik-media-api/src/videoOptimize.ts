import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** `media/{section}/{file}.mp4` → `media/{section}/posters/{file}.jpg` */
export function posterKeyFor(originalKey: string): string | null {
  const m = originalKey.match(/^(media\/[^/]+)\/([^/]+)\.(mp4|mov|webm)$/i)
  if (!m) return null
  if (m[1]!.endsWith('/posters') || m[1]!.endsWith('/thumbs')) return null
  return `${m[1]}/posters/${m[2]}.jpg`
}

export function isVideoContentType(contentType: string): boolean {
  return /^video\/(mp4|quicktime|webm)$/i.test(contentType.split(';')[0]!.trim())
}

function extFor(contentType: string): string {
  if (/webm/i.test(contentType)) return 'webm'
  if (/quicktime/i.test(contentType)) return 'mov'
  return 'mp4'
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
    }, 180_000)
    proc.stderr.on('data', (chunk: Buffer) => {
      err += chunk.toString()
      if (err.length > 8_000) err = err.slice(-4_000)
    })
    proc.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    proc.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(err.trim() || `ffmpeg exited ${code}`))
    })
  })
}

export type OptimizedVideo = {
  /** Faststart remux. Null when ffmpeg could not copy the file. */
  video: Buffer | null
  poster: Buffer | null
}

/**
 * Remux with `-c copy` (no quality change) so the moov atom is at the front,
 * and grab frame 0 as a JPEG poster. The original bytes are kept if remux fails.
 */
export async function optimizeVideoBuffer(
  source: Buffer,
  contentType: string,
): Promise<OptimizedVideo> {
  const dir = await mkdtemp(join(tmpdir(), 'khachik-video-'))
  const ext = extFor(contentType)
  const inputPath = join(dir, `in.${ext}`)
  const fastPath = join(dir, `out.${ext}`)
  const posterPath = join(dir, 'poster.jpg')
  try {
    await writeFile(inputPath, source)

    let poster: Buffer | null = null
    try {
      await runFfmpeg([
        '-y',
        '-ss',
        '0',
        '-i',
        inputPath,
        '-frames:v',
        '1',
        '-q:v',
        '3',
        posterPath,
      ])
      poster = await readFile(posterPath)
    } catch (err) {
      console.error('video poster failed', err)
    }

    let video: Buffer | null = null
    if (ext !== 'webm') {
      try {
        await runFfmpeg([
          '-y',
          '-i',
          inputPath,
          '-c',
          'copy',
          '-movflags',
          '+faststart',
          fastPath,
        ])
        video = await readFile(fastPath)
      } catch (err) {
        console.error('video faststart failed', err)
      }
    }

    return { video, poster }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
