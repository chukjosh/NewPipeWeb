// Channel.tsx
import { useParams } from 'react-router-dom'
import { useChannel, useSubscribe, useSubscriptions, useUnsubscribe } from '../hooks'
import VideoGrid from '../components/video/VideoGrid'
import { LoadingSpinner, ErrorMessage } from '../components/common'
import { Bell, BellOff } from 'lucide-react'

export default function Channel() {
  const { id } = useParams<{ id: string }>()
  const { data: channel, isLoading, isError, refetch } = useChannel(id ?? '')
  const { data: subscriptions } = useSubscriptions()
  const subscribe = useSubscribe()
  const unsubscribe = useUnsubscribe()

  if (isLoading) return <LoadingSpinner text="Loading channel..." />
  if (isError || !channel) return <ErrorMessage message="Could not load channel." onRetry={refetch} />

  const sub = subscriptions?.find(s => s.channelId === id)

  const handleSubscribeToggle = () => {
    if (sub) {
      unsubscribe.mutate(sub.id)
    } else {
      subscribe.mutate({
        channelId: channel.id,
        channelName: channel.name,
        channelUrl: channel.url,
        avatarUrl: channel.avatarUrl,
      })
    }
  }

  return (
    <div>
      {/* Banner */}
      {channel.bannerUrl && (
        <div className="h-40 bg-neutral-800 overflow-hidden">
          <img src={channel.bannerUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Channel info */}
      <div className="px-6 py-4 flex items-center gap-4 border-b border-neutral-800">
        <img
          src={channel.avatarUrl}
          alt={channel.name}
          className="w-16 h-16 rounded-full bg-neutral-800"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="flex-1">
          <h1 className="text-xl font-bold">{channel.name}</h1>
          {channel.subscriberCount > 0 && (
            <p className="text-sm text-neutral-400">
              {(channel.subscriberCount / 1_000_000).toFixed(1)}M subscribers
            </p>
          )}
        </div>
        <button onClick={handleSubscribeToggle} className={sub ? 'btn-secondary' : 'btn-primary'}>
          {sub ? <><BellOff size={14} className="inline mr-1" />Unsubscribe</> : <><Bell size={14} className="inline mr-1" />Subscribe</>}
        </button>
      </div>

      <div className="p-6">
        <VideoGrid videos={channel.videos} title="Videos" />
      </div>
    </div>
  )
}
