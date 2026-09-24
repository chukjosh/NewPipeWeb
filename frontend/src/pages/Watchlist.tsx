import { useEffect, useState } from 'react'
import { useWatchlist, useRemoveFromWatchlist } from '../hooks'
import { LoadingSpinner, EmptyState } from '../components/common'
import { useNavigate } from 'react-router-dom'
import { watchPath, thumbnailUrl } from '../utils/playback'
import { Trash2, Download, Upload } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { watchlistApi } from '../api/client'

const downloadJson = (fileName: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function Watchlist() {
  const { data, isLoading } = useWatchlist()
  const remove = useRemoveFromWatchlist()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleExport = async () => {
    try {
      const items = await watchlistApi.export()
      downloadJson('watchlist-export.json', { schemaVersion: 1, type: 'watchlist', data: items })
      setToast({ message: 'Watchlist exported', kind: 'success' })
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
      const summary = await watchlistApi.import(payload)
      qc.invalidateQueries({ queryKey: ['watchlist'] })
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
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download size={14} /> Export
          </button>
          <button onClick={() => document.getElementById('watchlist-import-input')?.click()} className="btn-secondary text-sm flex items-center gap-1.5">
            <Upload size={14} /> Import
          </button>
        </div>
      </div>

      <input id="watchlist-import-input" type="file" accept="application/json" className="hidden" onChange={handleImport} />

      {toast && (
        <div className={`mb-4 flex items-center justify-between rounded-lg border px-3 py-2 text-sm shadow-sm ${toast.kind === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'}`}>
          <span>{toast.message}</span>
          <button type="button" className="ml-4 font-bold opacity-80 hover:opacity-100" onClick={() => setToast(null)} aria-label="Close notification">×</button>
        </div>
      )}

      {!data?.length ? (
        <EmptyState icon="🔖" title="Your watchlist is empty"
          subtitle="Save videos to watch later by clicking the bookmark icon." />
      ) : (
        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors">
              <img
                src={thumbnailUrl(item.thumbnailUrl)} alt={item.title}
                className="w-28 aspect-video object-cover rounded-lg bg-neutral-800 shrink-0 cursor-pointer"
                onClick={() => navigate(watchPath({ id: item.videoId, url: item.url }))}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(watchPath({ id: item.videoId, url: item.url }))}>
                <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                <p className="text-xs text-neutral-400 mt-1">{item.uploader}</p>
              </div>
              <button onClick={() => remove.mutate(item.id)}
                className="p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-primary transition-colors shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
