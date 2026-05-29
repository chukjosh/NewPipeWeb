import type { StreamModel, StreamUrl } from '../types'

/** Build the watch page path for any service. */
export function watchPath(video: { id: string; url?: string }): string {
  if (video.url?.startsWith('http')) {
    return `/watch?url=${encodeURIComponent(video.url)}`
  }
  return `/watch/${video.id}`
}

/** Route external media through our backend proxy to avoid CDN CORS blocks. */
export function proxyMediaUrl(url: string, title?: string): string {
  if (!url || url.startsWith('/api/')) return url
  const safeTitle = title ? title.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100) : ''
  const titleParam = safeTitle ? `&title=${encodeURIComponent(safeTitle)}` : ''
  return `/api/proxy?url=${encodeURIComponent(url)}${titleParam}`
}

export function isHlsSource(url: string, format?: string): boolean {
  const f = format?.toUpperCase() ?? ''
  const u = url.toLowerCase()
  return f.includes('M3U8') || u.includes('.m3u8') || u.includes('application/vnd.apple.mpegurl')
}

/**
 * Pick the best stream for HTML5 playback.
 * SoundCloud and similar services often expose audio-only streams.
 */
export function pickDefaultStream(
  stream: StreamModel,
  preferredQuality: string,
): { stream: StreamUrl | null; useHls: boolean; hlsUrl: string | null } {
  const progressiveVideo = stream.videoStreams.filter(s => !s.isVideoOnly)
  const preferredVideo = progressiveVideo.find(s =>
    s.quality.startsWith(preferredQuality),
  )
  const video = preferredVideo ?? progressiveVideo[0]

  if (video) {
    return {
      stream: video,
      useHls: isHlsSource(video.url, video.format),
      hlsUrl: null,
    }
  }

  const audio = stream.audioStreams[0]
  if (audio) {
    return {
      stream: audio,
      useHls: isHlsSource(audio.url, audio.format),
      hlsUrl: null,
    }
  }

  if (stream.hlsUrl) {
    return { stream: null, useHls: true, hlsUrl: stream.hlsUrl }
  }

  return { stream: null, useHls: false, hlsUrl: null }
}
