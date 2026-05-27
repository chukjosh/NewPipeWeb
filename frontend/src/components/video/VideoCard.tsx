/**
 * VideoCard.tsx
 *
 * A single video/track card shown in grids and lists.
 * Displays thumbnail, title, uploader, duration, view count, and upload date.
 * Shows a service badge for non-YouTube content.
 *
 * Clicking navigates to the Watch page, passing the full content URL
 * so the backend can auto-detect the service.
 */

import { useNavigate } from 'react-router-dom'
import { ServiceBadge } from '../common'
import { watchPath } from '../../utils/playback'
import type { VideoModel } from '../../types'

/** Format seconds as M:SS or H:MM:SS */
function formatDuration(seconds: number): string {
  if (seconds < 0) return 'LIVE'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Format large view counts compactly */
function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000)     return `${(count / 1_000).toFixed(0)}K views`
  return `${count} views`
}

interface VideoCardProps {
  video: VideoModel
}

export default function VideoCard({ video }: VideoCardProps) {
  const navigate = useNavigate()

  /**
   * Navigate to the watch page.
   * We encode the full URL so the backend can auto-detect the service.
   * For YouTube this is a short ID; for others it's the full URL.
   */
  const handleClick = () => navigate(watchPath(video))

  return (
    <div onClick={handleClick} className="card group cursor-pointer">

      {/* Thumbnail */}
      <div className="relative aspect-video bg-neutral-800">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        {/* Duration badge — bottom right */}
        <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white
                         text-xs px-1.5 py-0.5 rounded font-mono">
          {formatDuration(video.duration)}
        </span>

        {/* LIVE badge */}
        {video.isLive && (
          <span className="absolute top-1.5 left-1.5 bg-red-600 text-white
                           text-xs px-1.5 py-0.5 rounded font-bold">
            LIVE
          </span>
        )}

        {/* Service badge — top right (hidden for YouTube) */}
        <div className="absolute top-1.5 right-1.5">
          <ServiceBadge service={video.service} />
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium line-clamp-2 text-white
                       group-hover:text-red-400 transition-colors leading-snug mb-1">
          {video.title}
        </h3>
        <p className="text-xs text-neutral-400 truncate">{video.uploader}</p>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
          {video.viewCount > 0 && <span>{formatViews(video.viewCount)}</span>}
          {video.uploadDate && (
            <>
              <span>·</span>
              <span>{video.uploadDate}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
