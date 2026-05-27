/**
 * Search.tsx
 *
 * Search results page.
 * Reads ?q= and ?service= from the URL — both set by the Navbar search form.
 * Service label is shown above results so users know where they're searching.
 */

import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { extractorApi } from '../api/client'
import VideoGrid from '../components/video/VideoGrid'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/common'

export default function Search() {
  const [params]  = useSearchParams()
  const query     = params.get('q') ?? ''
  const service   = params.get('service') ?? 'youtube'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', query, service],
    queryFn:  () => extractorApi.search(query, service),
    enabled:  query.length > 0,
    staleTime: 1000 * 60 * 5,
  })

  if (!query)            return <EmptyState icon="🔍" title="Search for something" />
  if (isLoading)         return <LoadingSpinner text={`Searching ${service} for "${query}"...`} />
  if (isError)           return <ErrorMessage message="Search failed." onRetry={refetch} />
  if (!data?.items.length) return (
    <EmptyState icon="😕" title="No results found"
      subtitle={`Nothing found for "${query}" on ${service}`} />
  )

  return (
    <div className="p-6">
      <p className="text-neutral-400 text-sm mb-4">
        Results for{' '}
        <span className="text-white font-medium">"{query}"</span>
        {' '}on{' '}
        <span className="text-red-400 font-medium capitalize">{service}</span>
      </p>
      <VideoGrid videos={data.items} />
    </div>
  )
}
