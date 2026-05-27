import type { VideoModel } from '../../types'
import VideoCard from './VideoCard'

interface VideoGridProps {
  videos: VideoModel[]
  title?: string
}

export default function VideoGrid({ videos, title }: VideoGridProps) {
  return (
    <div>
      {title && (
        <h2 className="text-lg font-semibold mb-4 px-1">{title}</h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                      xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <VideoCard key={`${video.id}-${video.url}`} video={video} />
        ))}
      </div>
    </div>
  )
}
