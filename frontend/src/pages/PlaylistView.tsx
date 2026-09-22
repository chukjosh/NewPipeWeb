import { useParams, useNavigate } from 'react-router-dom'
import { usePlaylist } from '../hooks'
import { useRemoveVideoFromPlaylist } from '../hooks'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/common'
import { thumbnailUrl } from '../utils/playback'
import { Play, Trash2 } from 'lucide-react'
import { watchPath } from '../utils/playback'

export default function PlaylistView() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = usePlaylist(Number(id))
  const navigate = useNavigate()
  const removeVideo = useRemoveVideoFromPlaylist()

  if (isLoading) return <LoadingSpinner />
  if (isError || !data) return <ErrorMessage message="Could not load playlist." />
  if (!data.videos.length) return <EmptyState icon="🎵" title="Playlist is empty" subtitle="Add videos by clicking ⋯ on any video." />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">{data.name}</h1>
      {data.description && <p className="text-neutral-400 text-sm mb-4">{data.description}</p>}
      <p className="text-neutral-500 text-sm mb-6">{data.videos.length} videos</p>

      <div className="space-y-2">
        {data.videos.map((item, index) => (
          <div key={item.id}
            className="flex items-center gap-3 p-3 bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
            onClick={() => navigate(watchPath({
              id: item.videoId,
              url: item.url || (item.videoId.startsWith('http') ? item.videoId : undefined),
            }))}
          >
            <span className="text-neutral-500 text-sm w-6 text-center shrink-0">{index + 1}</span>
            <img
              src={thumbnailUrl(item.thumbnailUrl)} alt={item.title}
              className="w-24 aspect-video object-cover rounded-lg bg-neutral-800 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-2">{item.title}</p>
              <p className="text-xs text-neutral-400 mt-1">{item.uploader}</p>
            </div>
            <Play size={16} className="text-neutral-500 shrink-0" />
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                removeVideo.mutate({ playlistId: Number(id), videoItemId: item.id })
              }}
              className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-primary"
              aria-label={`Remove ${item.title} from playlist`}
              title="Remove from playlist"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
