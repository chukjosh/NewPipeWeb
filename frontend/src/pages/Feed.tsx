import { useFeed, useSubscriptions } from '../hooks'
import VideoGrid from '../components/video/VideoGrid'
import { LoadingSpinner, EmptyState, ErrorMessage } from '../components/common'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function Feed() {
  const { data: subscriptions } = useSubscriptions()
  const { data: feed, isLoading, isError, refetch } = useFeed()
  const navigate = useNavigate()
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  if (!subscriptions?.length) return (
    <div className="p-6">
      <EmptyState icon="📡" title="No subscriptions yet"
        subtitle="Subscribe to channels to see their latest videos here." />
      <div className="flex justify-center mt-4">
        <button onClick={() => navigate('/')} className="btn-primary">Explore Videos</button>
      </div>
    </div>
  )

  if (isLoading) return <LoadingSpinner text="Loading feed from your subscriptions..." />
  if (isError) return <ErrorMessage message="Could not load feed." onRetry={refetch} />
  if (!feed?.length) return <EmptyState icon="📭" title="Feed is empty" subtitle="No recent videos from your subscriptions." />

  const sortedFeed = [...feed].sort((left, right) => {
    const leftTimestamp = left.uploadDateTimestamp ?? Number.MIN_SAFE_INTEGER
    const rightTimestamp = right.uploadDateTimestamp ?? Number.MIN_SAFE_INTEGER
    return sortOrder === 'newest'
      ? rightTimestamp - leftTimestamp
      : leftTimestamp - rightTimestamp
  })

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">📡 Subscription Feed</h1>
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          Sort by
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      <VideoGrid videos={sortedFeed} />
    </div>
  )
}
