/**
 * Keep decoded still thumbs alive across scroll / route revisits so the grid
 * does not flash-reload when tiles re-enter the viewport.
 */
const warm = new Map<string, HTMLImageElement>()

export function warmStill(url: string): Promise<void> {
  if (!url) return Promise.resolve()
  const existing = warm.get(url)
  if (existing?.complete && existing.naturalWidth > 0) return Promise.resolve()

  return new Promise((resolve) => {
    const img = existing ?? new Image()
    img.decoding = 'async'
    const finish = () => resolve()
    img.onload = finish
    img.onerror = finish
    if (!existing) {
      warm.set(url, img)
      img.src = url
    } else if (img.complete) {
      finish()
    }
  })
}

export async function warmStills(
  urls: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const list = urls.filter(Boolean)
  if (!list.length) {
    onProgress?.(1, 1)
    return
  }
  let done = 0
  await Promise.all(
    list.map(async (url) => {
      await warmStill(url)
      done += 1
      onProgress?.(done, list.length)
    }),
  )
}

export function stillIsWarm(url: string): boolean {
  const img = warm.get(url)
  return Boolean(img?.complete && img.naturalWidth > 0)
}
