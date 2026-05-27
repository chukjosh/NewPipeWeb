/**
 * ServiceSelector.tsx
 *
 * Dropdown that lets the user pick which streaming service to search on.
 * Fetches the list of supported services from GET /services on mount.
 *
 * Usage:
 *   <ServiceSelector value={service} onChange={setService} />
 *
 * Service icons are emoji for now — can be replaced with SVG logos later.
 */

import { useQuery } from '@tanstack/react-query'
import { servicesApi } from '../../api/client'
import type { ServiceInfo } from '../../types'

/** Emoji icons for each service ID */
const SERVICE_ICONS: Record<string, string> = {
  youtube:    '▶️',
  soundcloud: '🔊',
  peertube:   '🐘',
  bandcamp:   '🎵',
  mediaccc:   '🎙️',
  odysee:     '🌊',
}

interface ServiceSelectorProps {
  value: string
  onChange: (serviceId: string) => void
  /** Only show services that support a given feature */
  filter?: (service: ServiceInfo) => boolean
}

export default function ServiceSelector({ value, onChange, filter }: ServiceSelectorProps) {
  // Fetch supported services from backend
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
    staleTime: Infinity, // services never change at runtime
  })

  const filtered = filter ? services?.filter(filter) : services

  if (!filtered?.length) return null

  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-neutral-800 border border-neutral-700
                   rounded-lg pl-8 pr-3 py-2 text-sm text-white
                   outline-none focus:border-red-500 cursor-pointer
                   transition-colors hover:bg-neutral-700"
        aria-label="Select streaming service"
      >
        {filtered.map(service => (
          <option key={service.id} value={service.id}>
            {SERVICE_ICONS[service.id] ?? '🌐'} {service.name}
          </option>
        ))}
      </select>

      {/* Icon overlay on the left of the select */}
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-sm">
        {SERVICE_ICONS[value] ?? '🌐'}
      </span>
    </div>
  )
}
