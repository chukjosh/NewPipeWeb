import { useFeed, useSubscriptions } from '../hooks'
import VideoGrid from '../components/video/VideoGrid'
import { LoadingSpinner, EmptyState, ErrorMessage } from '../components/common'
import { useNavigate } from 'react-router-dom'

export default function Feed() {
  const { data: subscriptions } = useSubscriptions()
  const { data: feed, isLoading, isError, refetch } = useFeed()
  const navigate = useNavigate()

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

  return (
    <div className="p-6">
      <VideoGrid videos={feed} title="📡 Subscription Feed" />
    </div>
  )
}
