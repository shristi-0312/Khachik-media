import type { ApiMediaSrcSet } from '../api/client'
import { stillDisplayUrl, stillSrcSet } from '../media/cdn'

type Props = {
  /** Original master URL — used to derive paths if API fields missing. */
  url: string
  thumbUrl?: string | null
  srcset?: ApiMediaSrcSet | null
  alt?: string
  className?: string
  /** Masonry column hint — matches existing breakpoints, no CSS change. */
  sizes?: string
  loading?: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low' | 'auto'
  decoding?: 'async' | 'auto' | 'sync'
  onLoad?: () => void
  imgRef?: (el: HTMLImageElement | null) => void
}

const DEFAULT_SIZES =
  '(max-width: 719px) 100vw, (max-width: 1023px) 50vw, 25vw'

/**
 * HQ responsive still via <picture> — AVIF → WebP → JPEG.
 * Markup only; inherits parent tile styles (no visual redesign).
 */
export function ResponsiveStill({
  url,
  thumbUrl,
  srcset: apiSrcset,
  alt = '',
  className,
  sizes = DEFAULT_SIZES,
  loading = 'lazy',
  fetchPriority = 'auto',
  decoding = 'async',
  onLoad,
  imgRef,
}: Props) {
  const derived = apiSrcset ?? stillSrcSet(url)
  const jpgSrc = thumbUrl || stillDisplayUrl(url)

  if (!derived) {
    return (
      <img
        ref={imgRef}
        className={className}
        src={jpgSrc}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
        onLoad={onLoad}
      />
    )
  }

  return (
    <picture>
      <source type="image/avif" srcSet={derived.avif} sizes={sizes} />
      <source type="image/webp" srcSet={derived.webp} sizes={sizes} />
      <img
        ref={imgRef}
        className={className}
        src={jpgSrc}
        srcSet={derived.jpg}
        sizes={sizes}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
        onLoad={onLoad}
      />
    </picture>
  )
}
