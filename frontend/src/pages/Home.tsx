/**
 * Home.tsx
 *
 * The landing page — shows trending/featured content.
 * Users can switch between services using the service selector tabs.
 * Only services that support trending are shown.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { extractorApi, servicesApi } from '../api/client'
import VideoGrid from '../components/video/VideoGrid'
import { LoadingSpinner, ErrorMessage } from '../components/common'

export default function Home() {
  // Active service tab — defaults to YouTube
  const [activeService, setActiveService] = useState('youtube')

  // Fetch supported services to build the tab bar
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
    staleTime: Infinity,
  })

  // Fetch trending for the active service
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trending', activeService],
    queryFn: () => extractorApi.getTrending(activeService),
    staleTime: 1000 * 60 * 15, // cache for 15 minutes
  })

  // Only show services that have a trending/featured feed
  const trendingServices = services?.filter(s => s.supportsTrending) ?? []

  return (
    <div className="p-6">

      {/* Service tab bar */}
      {trendingServices.length > 1 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {trendingServices.map(service => (
            <button
              key={service.id}
              onClick={() => setActiveService(service.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${activeService === service.id
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
            >
              {service.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading && <LoadingSpinner text={`Loading ${activeService} trending...`} />}
      {isError   && <ErrorMessage message="Could not load trending content." onRetry={refetch} />}
      {data      && <VideoGrid videos={data} title="🔥 Trending" />}
    </div>
  )
}
