/**
 * common/index.tsx
 *
 * Shared UI components used across multiple pages.
 * Import from here: import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/common'
 */

// ─── Loading spinner ──────────────────────────────────────
export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-neutral-700 border-t-red-600
                      rounded-full animate-spin" />
      <p className="text-neutral-400 text-sm">{text}</p>
    </div>
  )
}

// ─── Error message with optional retry ───────────────────
export function ErrorMessage({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-4xl">⚠️</div>
      <p className="text-neutral-300 text-center max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      )}
    </div>
  )
}

// ─── Empty state placeholder ──────────────────────────────
export function EmptyState({
  icon = '📭',
  title,
  subtitle,
}: {
  icon?: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="text-5xl">{icon}</div>
      <h3 className="text-lg font-semibold text-neutral-200">{title}</h3>
      {subtitle && (
        <p className="text-neutral-400 text-sm text-center max-w-xs">{subtitle}</p>
      )}
    </div>
  )
}

// ─── Service badge ────────────────────────────────────────
/** Small colored badge showing which service a video is from */
export function ServiceBadge({ service }: { service: string }) {
  const colors: Record<string, string> = {
    youtube:    'bg-red-600',
    soundcloud: 'bg-orange-500',
    peertube:   'bg-blue-600',
    bandcamp:   'bg-teal-600',
    mediaccc:   'bg-purple-600',
    odysee:     'bg-cyan-600',
  }
  const color = colors[service.toLowerCase()] ?? 'bg-neutral-600'

  if (service === 'youtube') return null // don't show badge for default service

  return (
    <span className={`${color} text-white text-xs px-1.5 py-0.5 rounded font-medium capitalize`}>
      {service}
    </span>
  )
}
