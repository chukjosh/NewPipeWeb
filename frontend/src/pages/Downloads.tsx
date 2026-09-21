import { useEffect, useRef, useState } from 'react'
import { useDownloads, useDeleteDownload, useRetryDownload, usePauseDownload, useResumeDownload } from '../hooks'
import { LoadingSpinner, EmptyState } from '../components/common'
import { downloadApi } from '../api/client'
import { thumbnailUrl } from '../utils/playback'
import { Trash2, Download, CheckCircle, XCircle, Loader, RotateCw, Ban, Pause, Play, PauseCircle } from 'lucide-react'
import type { DownloadStatus } from '../types'

function StatusIcon({ status }: { status: DownloadStatus }) {
  switch (status) {
    case 'COMPLETED': return <CheckCircle size={16} className="text-green-500" />
    case 'FAILED': return <XCircle size={16} className="text-red-500" />
    case 'DOWNLOADING': return <Loader size={16} className="text-blue-400 animate-spin" />
    case 'PAUSED': return <PauseCircle size={16} className="text-amber-400" />
    default: return <Loader size={16} className="text-neutral-400" />
  }
}

function formatEta(seconds: number) {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s remaining`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s remaining`
}

function DownloadEstimate({ downloaded, total, status }: {
  downloaded: number
  total: number
  status: DownloadStatus
}) {
  const previous = useRef({ downloaded, time: Date.now() })
  const [bytesPerSecond, setBytesPerSecond] = useState(0)

  useEffect(() => {
    const now = Date.now()
    const elapsed = (now - previous.current.time) / 1000
    const bytes = downloaded - previous.current.downloaded
    if (status === 'DOWNLOADING' && elapsed > 0 && bytes > 0) {
      setBytesPerSecond(bytes / elapsed)
    }
    previous.current = { downloaded, time: now }
  }, [downloaded, status])

  if (status !== 'DOWNLOADING' || total <= 0 || bytesPerSecond <= 0) return null
  return (
    <span className="text-xs text-neutral-500">
      {formatEta(Math.max(0, (total - downloaded) / bytesPerSecond))}
    </span>
  )
}

function ProgressBar({ downloaded, total }: { downloaded: number; total: number }) {
  const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0
  return (
    <div className="w-full bg-neutral-700 rounded-full h-1.5 mt-2">
      <div className="bg-red-600 h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function Downloads() {
  const { data, isLoading } = useDownloads()
  const remove = useDeleteDownload()
  const retry = useRetryDownload()
  const pause = usePauseDownload()
  const resume = useResumeDownload()

  if (isLoading) return <LoadingSpinner />
  if (!data?.length) return (
    <EmptyState icon="💾" title="No downloads yet"
      subtitle="Download videos from any watch page." />
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Downloads</h1>
      <div className="space-y-3">
        {data.map((dl) => (
          <div key={dl.id} className="flex items-center gap-4 p-4 bg-neutral-900 rounded-xl">
            <img
              src={thumbnailUrl(dl.thumbnailUrl)} alt={dl.title}
              className="w-24 aspect-video object-cover rounded-lg bg-neutral-800 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-1">{dl.title}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{dl.uploader} · {dl.quality}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <StatusIcon status={dl.status} />
                <span className="text-xs text-neutral-400 capitalize">{dl.status.toLowerCase()}</span>
                {dl.fileSize > 0 && (
                  <span className="text-xs text-neutral-500">
                    {(dl.downloadedBytes / 1_000_000).toFixed(1)}
                    /{(dl.fileSize / 1_000_000).toFixed(1)} MB
                  </span>
                )}
                <DownloadEstimate
                  downloaded={dl.downloadedBytes}
                  total={dl.fileSize}
                  status={dl.status}
                />
              </div>
              {(dl.status === 'DOWNLOADING' || dl.status === 'PENDING') && (
                <ProgressBar downloaded={dl.downloadedBytes} total={dl.fileSize} />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(dl.status === 'DOWNLOADING' || dl.status === 'PENDING') && (
                <>
                  <button
                    id={`pause-download-${dl.id}`}
                    onClick={() => pause.mutate(dl.id)}
                    disabled={pause.isPending}
                    className="p-2 hover:bg-neutral-700 rounded-lg text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Pause download"
                    aria-label={`Pause download: ${dl.title}`}
                  >
                    <Pause size={16} />
                  </button>
                  <button
                    id={`cancel-download-${dl.id}`}
                    onClick={() => remove.mutate(dl.id)}
                    disabled={remove.isPending}
                    className="p-2 hover:bg-neutral-700 rounded-lg text-red-400 hover:text-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Cancel and remove download"
                    aria-label={`Cancel and remove download: ${dl.title}`}
                  >
                    <Ban size={16} />
                  </button>
                </>
              )}
              {dl.status === 'PAUSED' && (
                <>
                  <button
                    id={`resume-download-${dl.id}`}
                    onClick={() => resume.mutate(dl.id)}
                    disabled={resume.isPending}
                    className="p-2 hover:bg-neutral-700 rounded-lg text-green-400 hover:text-green-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Resume download"
                    aria-label={`Resume download: ${dl.title}`}
                  >
                    {resume.isPending ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
                  </button>
                  <button
                    id={`cancel-download-${dl.id}`}
                    onClick={() => remove.mutate(dl.id)}
                    disabled={remove.isPending}
                    className="p-2 hover:bg-neutral-700 rounded-lg text-red-400 hover:text-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Cancel and remove download"
                    aria-label={`Cancel and remove download: ${dl.title}`}
                  >
                    <Ban size={16} />
                  </button>
                </>
              )}
              {dl.status === 'COMPLETED' && (
                <a href={downloadApi.getFileUrl(dl.id)}
                  className="p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors"
                  download title="Save file">
                  <Download size={16} />
                </a>
              )}
              {dl.status === 'FAILED' && (
                <button
                  id={`retry-download-${dl.id}`}
                  onClick={() => retry.mutate(dl.id)}
                  disabled={!dl.streamUrl || retry.isPending}
                  title={dl.streamUrl ? 'Retry download' : 'No stream URL stored, restart from the watch page'}
                  className="p-2 hover:bg-neutral-700 rounded-lg transition-colors
                    disabled:opacity-40 disabled:cursor-not-allowed
                    text-amber-400 hover:text-amber-300 disabled:text-neutral-500"
                >
                  {retry.isPending
                    ? <Loader size={16} className="animate-spin" />
                    : <RotateCw size={16} />}
                </button>
              )}
              <button
                id={`delete-download-${dl.id}`}
                onClick={() => remove.mutate(dl.id)}
                disabled={remove.isPending}
                className="p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Remove download"
                aria-label={`Remove download: ${dl.title}`}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
