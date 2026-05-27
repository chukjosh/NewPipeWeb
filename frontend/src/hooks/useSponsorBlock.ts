/**
 * useSponsorBlock.ts
 *
 * React hook that fetches SponsorBlock segments for a video
 * and returns a function to check if the current playback
 * position is inside a segment that should be skipped.
 *
 * Usage in a player component:
 *   const { segments, getSkipTarget } = useSponsorBlock(videoId)
 *
 *   // In your timeupdate handler:
 *   const skipTo = getSkipTarget(currentTime)
 *   if (skipTo !== null) videoEl.currentTime = skipTo
 */

import { useEffect, useState } from 'react'
import { fetchSponsorSegments, type SponsorSegment } from '../api/sponsorblock'
import { useAppStore } from '../store/useAppStore'

interface UseSponsorBlockResult {
  /** All segments fetched for this video */
  segments: SponsorSegment[]
  /** Whether segments are currently being loaded */
  isLoading: boolean
  /**
   * Given the current playback time (seconds), returns the timestamp
   * to skip TO if inside a skippable segment, or null if no skip needed.
   */
  getSkipTarget: (currentTime: number) => number | null
}

export function useSponsorBlock(videoId: string): UseSponsorBlockResult {
  const [segments, setSegments] = useState<SponsorSegment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sponsorBlockEnabled    = useAppStore(s => s.sponsorBlockEnabled)
  const sponsorBlockCategories = useAppStore(s => s.sponsorBlockCategories)

  // Fetch segments whenever the video changes or settings change
  useEffect(() => {
    if (!sponsorBlockEnabled || !videoId) {
      setSegments([])
      return
    }

    setIsLoading(true)
    fetchSponsorSegments(videoId, sponsorBlockCategories)
      .then(setSegments)
      .finally(() => setIsLoading(false))
  }, [videoId, sponsorBlockEnabled, sponsorBlockCategories.join(',')])

  /**
   * Check if currentTime falls inside any sponsor segment.
   * Returns the end time of the segment (i.e. where to skip to),
   * or null if no skip is needed.
   *
   * Called on every video timeupdate event (roughly every 250ms).
   */
  const getSkipTarget = (currentTime: number): number | null => {
    if (!sponsorBlockEnabled || segments.length === 0) return null

    for (const seg of segments) {
      // Add a small buffer (0.5s) to avoid triggering at segment edges
      if (currentTime >= seg.startTime && currentTime < seg.endTime - 0.5) {
        return seg.endTime
      }
    }
    return null
  }

  return { segments, isLoading, getSkipTarget }
}
