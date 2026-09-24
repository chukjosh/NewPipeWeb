import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSubscriptions, useUnsubscribe, useUnsubscribeMany } from '../hooks'
import { LoadingSpinner, EmptyState } from '../components/common'
import { BellOff, Download, Trash2, Upload, X } from 'lucide-react'
import { subscriptionApi } from '../api/client'

function formatSubscribedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Added date unavailable'

  return `Added ${date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })}`
}

export default function Subscriptions() {
  const { data, isLoading } = useSubscriptions()
  const unsubscribe = useUnsubscribe()
  const unsubscribeMany = useUnsubscribeMany()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [importSummary, setImportSummary] = useState<{ added: number; alreadySubscribed: number; updated: number; removed: number } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [replaceOnImport, setReplaceOnImport] = useState(false)

  useEffect(() => {
    if (!importSummary) return

    const timer = window.setTimeout(() => {
      setImportSummary(null)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [importSummary])

  const handleExport = async (format: 'json' | 'txt') => {
    const payload = await subscriptionApi.export(format)
    const blob = new Blob(
      [format === 'json' ? JSON.stringify(payload, null, 2) : String(payload)],
      { type: format === 'json' ? 'application/json' : 'text/plain;charset=utf-8' }
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `subscriptions.${format === 'json' ? 'json' : 'txt'}`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const format = file.name.toLowerCase().endsWith('.json') ? 'json' : 'txt'
    const payload = await file.text()
    if (replaceOnImport && !window.confirm('Replace all existing subscriptions with this import?')) {
      event.target.value = ''
      return
    }
    const summary = await subscriptionApi.import(format, payload, replaceOnImport)

    setImportSummary(summary)
    setSelectedIds(new Set())
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    queryClient.invalidateQueries({ queryKey: ['feed'] })
    event.target.value = ''
  }

  const toggleSelection = (id: number) => {
    setSelectedIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(current => current.size === data?.length
      ? new Set()
      : new Set(data?.map(subscription => subscription.id) ?? []))
  }

  const handleBulkDelete = () => {
    if (!selectedIds.size) return
    if (!window.confirm(`Unsubscribe from ${selectedIds.size} selected channel${selectedIds.size === 1 ? '' : 's'}?`)) return
    unsubscribeMany.mutate([...selectedIds], { onSuccess: () => setSelectedIds(new Set()) })
  }

  if (isLoading) return <LoadingSpinner />
  if (!data?.length) return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('json')} className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 hover:text-white">
            <Download size={14} /> Export JSON
          </button>
          <button onClick={() => handleExport('txt')} className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 hover:text-white">
            <Download size={14} /> Export TXT
          </button>
          <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500">
            <Upload size={14} /> Import
          </button>
        </div>
      </div>
      <label className="mb-6 flex items-center gap-2 text-sm text-neutral-400">
        <input type="checkbox" checked={replaceOnImport} onChange={(event) => setReplaceOnImport(event.target.checked)} />
        Replace existing subscriptions when importing
      </label>
      <input ref={inputRef} type="file" accept=".json,.txt,text/plain,application/json" className="hidden" onChange={handleImportFile} />
      {importSummary && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-emerald-600/30 bg-emerald-100 text-emerald-900 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 px-3 py-2 text-sm">
          <span>{importSummary.added} added, {importSummary.updated} updated, {importSummary.removed} removed, {importSummary.alreadySubscribed} already subscribed</span>
          <button
            type="button"
            onClick={() => setImportSummary(null)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-inherit transition hover:bg-emerald-900/10 dark:hover:bg-emerald-500/20"
            aria-label="Close import summary"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <EmptyState icon="📡" title="No subscriptions yet"
        subtitle="Subscribe to channels to see them here." />
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('json')} className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 hover:text-white">
            <Download size={14} /> Export JSON
          </button>
          <button onClick={() => handleExport('txt')} className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 hover:text-white">
            <Download size={14} /> Export TXT
          </button>
          <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500">
            <Upload size={14} /> Import
          </button>
        </div>
      </div>
      <input ref={inputRef} type="file" accept=".json,.txt,text/plain,application/json" className="hidden" onChange={handleImportFile} />
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
        <label className="inline-flex items-center gap-2 text-neutral-300">
          <input
            type="checkbox"
            checked={selectedIds.size > 0 && selectedIds.size === data.length}
            onChange={toggleSelectAll}
          />
          Select all ({data.length})
        </label>
        <button
          type="button"
          onClick={handleBulkDelete}
          disabled={!selectedIds.size || unsubscribeMany.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={14} />
          Delete selected ({selectedIds.size})
        </button>
        <label className="inline-flex items-center gap-2 text-neutral-400">
          <input type="checkbox" checked={replaceOnImport} onChange={(event) => setReplaceOnImport(event.target.checked)} />
          Replace existing subscriptions when importing
        </label>
      </div>
      {importSummary && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-emerald-600/30 bg-emerald-100 text-emerald-900 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 px-3 py-2 text-sm">
          <span>{importSummary.added} added, {importSummary.updated} updated, {importSummary.removed} removed, {importSummary.alreadySubscribed} already subscribed</span>
          <button
            type="button"
            onClick={() => setImportSummary(null)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-inherit transition hover:bg-emerald-900/10 dark:hover:bg-emerald-500/20"
            aria-label="Close import summary"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {data.map((sub) => (
          <div key={sub.id} className="relative flex flex-col items-center gap-2 p-4 bg-neutral-900 rounded-xl group">
            <label className="absolute left-3 top-3" aria-label={`Select ${sub.channelName}`}>
              <input
                type="checkbox"
                checked={selectedIds.has(sub.id)}
                onChange={() => toggleSelection(sub.id)}
              />
            </label>
            <img
              src={sub.avatarUrl} alt={sub.channelName}
              className="w-16 h-16 rounded-full bg-neutral-800 cursor-pointer"
              onClick={() => navigate(`/channel?url=${encodeURIComponent(sub.channelUrl)}`)}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <p className="text-sm font-medium text-center line-clamp-2 cursor-pointer"
              onClick={() => navigate(`/channel?url=${encodeURIComponent(sub.channelUrl)}`)}>
              {sub.channelName}
            </p>
            <p className="text-xs text-neutral-500 text-center">
              {formatSubscribedAt(sub.subscribedAt)}
            </p>
            <button onClick={() => unsubscribe.mutate(sub.id)}
              className="text-xs text-neutral-500 hover:text-red-400 flex items-center gap-1 transition-colors">
              <BellOff size={12} /> Unsubscribe
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
