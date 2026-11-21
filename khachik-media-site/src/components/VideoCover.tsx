import { useEffect, useRef, useState } from 'react'

type Props = {
  /** Full-quality video URL (CloudFront master). */
  videoUrl: string
  /** CDN poster JPEG when present. */
  posterUrl?: string | null
  className?: string
  /** Hover / focus: play the MP4. Idle: poster (or first-frame fallback). */
  playing: boolean
}

/**
 * Idle: static poster. If the poster 404/403s, fall back to a paused
 * metadata frame so cards never show a broken-image icon.
 * Playing: attach and play the full MP4 (same as before).
 */
export function VideoCover({ videoUrl, posterUrl, className, playing }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [posterFailed, setPosterFailed] = useState(false)
  const poster = posterUrl || undefined
  const showPoster = Boolean(poster) && !posterFailed

  useEffect(() => {
    setPosterFailed(false)
  }, [poster, videoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !playing || !videoUrl) return

    if (video.src !== videoUrl) {
      video.src = videoUrl
      video.preload = 'auto'
      video.load()
    }
    void video.play().catch(() => {})

    return () => {
      video.pause()
      if (video.readyState >= 2) video.currentTime = 0
    }
  }, [playing, videoUrl])

  if (playing) {
    return (
      <video
        ref={videoRef}
        className={className}
        poster={showPoster ? poster : undefined}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
    )
  }

  if (showPoster) {
    return (
      <img
        className={className}
        src={poster}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setPosterFailed(true)}
      />
    )
  }

  // Missing / failed poster — show frame 0 via metadata (no autoplay).
  return (
    <video
      className={className}
      src={videoUrl}
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  )
}
