import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { usePlaylists, useCreatePlaylist, useDeletePlaylist } from '../hooks'
import { playlistApi } from '../api/client'
import { LoadingSpinner, EmptyState } from '../components/common'
import { thumbnailUrl } from '../utils/playback'
import { Plus, Trash2, ListVideo, Download, Upload } from 'lucide-react'

const downloadJson = (fileName: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function Library() {
  const { data, isLoading } = usePlaylists()
  const create = useCreatePlaylist()
  const remove = useDeletePlaylist()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleCreate = async () => {
    if (!name.trim()) return
    await create.mutateAsync({ name: name.trim(), description: desc.trim() })
    setName(''); setDesc(''); setShowForm(false)
  }

  const handleExport = async () => {
    try {
      const items = await playlistApi.export()
      downloadJson('playlists-export.json', { schemaVersion: 1, type: 'playlists', data: items })
      setToast({ message: 'Playlists exported', kind: 'success' })
    } catch {
      setToast({ message: 'Export failed', kind: 'error' })
    }
  }

  const handleImport = async (event: any) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const summary = await playlistApi.import(payload)
      qc.invalidateQueries({ queryKey: ['playlists'] })
      setToast({ message: `${summary.added} added · ${summary.alreadyExisted} already existed`, kind: 'success' })
    } catch {
      setToast({ message: 'Import failed', kind: 'error' })
    } finally {
      event.target.value = ''
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold">Library</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download size={14} /> Export
          </button>
          <button onClick={() => document.getElementById('playlist-import-input')?.click()} className="btn-secondary text-sm flex items-center gap-1.5">
            <Upload size={14} /> Import
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus size={14} className="inline mr-1" /> New Playlist
          </button>
        </div>
      </div>

      <input id="playlist-import-input" type="file" accept="application/json" className="hidden" onChange={handleImport} />

      {toast && (
        <div className={`mb-4 flex items-center justify-between rounded-lg border px-3 py-2 text-sm shadow-sm ${toast.kind === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'}`}>
          <span>{toast.message}</span>
          <button type="button" className="ml-4 font-bold opacity-80 hover:opacity-100" onClick={() => setToast(null)} aria-label="Close notification">×</button>
        </div>
      )}

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
                  ? <img src={thumbnailUrl(playlist.thumbnailUrl)} alt={playlist.name} className="w-full h-full object-cover" />
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
