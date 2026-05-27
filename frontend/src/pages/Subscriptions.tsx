import { useNavigate } from 'react-router-dom'
import { useSubscriptions, useUnsubscribe } from '../hooks'
import { LoadingSpinner, EmptyState } from '../components/common'
import { BellOff } from 'lucide-react'

export default function Subscriptions() {
  const { data, isLoading } = useSubscriptions()
  const unsubscribe = useUnsubscribe()
  const navigate = useNavigate()

  if (isLoading) return <LoadingSpinner />
  if (!data?.length) return (
    <EmptyState icon="📡" title="No subscriptions yet"
      subtitle="Subscribe to channels to see them here." />
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {data.map((sub) => (
          <div key={sub.id} className="flex flex-col items-center gap-2 p-4 bg-neutral-900 rounded-xl group">
            <img
              src={sub.avatarUrl} alt={sub.channelName}
              className="w-16 h-16 rounded-full bg-neutral-800 cursor-pointer"
              onClick={() => navigate(`/channel/${sub.channelId}`)}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <p className="text-sm font-medium text-center line-clamp-2 cursor-pointer"
              onClick={() => navigate(`/channel/${sub.channelId}`)}>
              {sub.channelName}
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
