import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlaylists, useCreatePlaylist, useDeletePlaylist } from '../hooks'
import { LoadingSpinner, EmptyState } from '../components/common'
import { Plus, Trash2, ListVideo } from 'lucide-react'

export default function Library() {
  const { data, isLoading } = usePlaylists()
  const create = useCreatePlaylist()
  const remove = useDeletePlaylist()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    await create.mutateAsync({ name: name.trim(), description: desc.trim() })
    setName(''); setDesc(''); setShowForm(false)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Library</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={14} className="inline mr-1" /> New Playlist
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-900 rounded-xl p-4 mb-6 space-y-3">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Playlist name" className="input" />
          <input value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Description (optional)" className="input" />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary">Create</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {!data?.length ? (
        <EmptyState icon="📚" title="No playlists yet" subtitle="Create a playlist to organize your videos." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((playlist) => (
            <div key={playlist.id} className="card group">
              <div
                className="aspect-video bg-neutral-800 flex items-center justify-center cursor-pointer relative"
                onClick={() => navigate(`/playlist/${playlist.id}`)}
              >
                {playlist.thumbnailUrl
                  ? <img src={playlist.thumbnailUrl} alt={playlist.name} className="w-full h-full object-cover" />
                  : <ListVideo size={40} className="text-neutral-600" />
                }
                <div className="absolute bottom-2 right-2 bg-black/80 text-xs px-1.5 py-0.5 rounded">
                  {playlist.videoCount} videos
                </div>
              </div>
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="cursor-pointer" onClick={() => navigate(`/playlist/${playlist.id}`)}>
                  <p className="font-medium text-sm">{playlist.name}</p>
                  {playlist.description && <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{playlist.description}</p>}
                </div>
                <button onClick={() => remove.mutate(playlist.id)}
                  className="p-1.5 hover:bg-neutral-700 rounded-lg text-neutral-400 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
