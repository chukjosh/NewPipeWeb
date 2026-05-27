// History.tsx
import { useHistory, useDeleteHistory, useClearHistory } from '../hooks'
import { LoadingSpinner, EmptyState } from '../components/common'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'

export function History() {
  const { data, isLoading } = useHistory()
  const deleteOne = useDeleteHistory()
  const clearAll = useClearHistory()
  const navigate = useNavigate()

  if (isLoading) return <LoadingSpinner />
  if (!data?.length) return <EmptyState icon="🕐" title="No watch history" subtitle="Videos you watch will appear here." />

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Watch History</h1>
        <button onClick={() => clearAll.mutate()} className="btn-secondary text-sm">
          <Trash2 size={14} className="inline mr-1" /> Clear All
        </button>
      </div>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors">
            <img
              src={item.thumbnailUrl} alt={item.title}
              className="w-28 aspect-video object-cover rounded-lg bg-neutral-800 shrink-0 cursor-pointer"
              onClick={() => navigate(`/watch/${item.videoId}`)}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/watch/${item.videoId}`)}>
              <p className="font-medium text-sm line-clamp-2">{item.title}</p>
              <p className="text-xs text-neutral-400 mt-1">{item.uploader}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{new Date(item.watchedAt).toLocaleString()}</p>
            </div>
            <button onClick={() => deleteOne.mutate(item.id)} className="p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors shrink-0">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default History
