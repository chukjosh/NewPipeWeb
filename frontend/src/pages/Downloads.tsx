import { useDownloads, useDeleteDownload } from '../hooks'
import { LoadingSpinner, EmptyState } from '../components/common'
import { downloadApi } from '../api/client'
import { Trash2, Download, CheckCircle, XCircle, Loader } from 'lucide-react'
import type { DownloadStatus } from '../types'

function StatusIcon({ status }: { status: DownloadStatus }) {
  switch (status) {
    case 'COMPLETED':  return <CheckCircle size={16} className="text-green-500" />
    case 'FAILED':     return <XCircle size={16} className="text-red-500" />
    case 'DOWNLOADING':return <Loader size={16} className="text-blue-400 animate-spin" />
    default:           return <Loader size={16} className="text-neutral-400" />
  }
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
              src={dl.thumbnailUrl} alt={dl.title}
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
              </div>
              {(dl.status === 'DOWNLOADING' || dl.status === 'PENDING') && (
                <ProgressBar downloaded={dl.downloadedBytes} total={dl.fileSize} />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {dl.status === 'COMPLETED' && (
                <a href={downloadApi.getFileUrl(dl.id)}
                  className="p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors"
                  download title="Save file">
                  <Download size={16} />
                </a>
              )}
              <button onClick={() => remove.mutate(dl.id)}
                className="p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
