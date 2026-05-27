/**
 * sponsorblock.ts
 *
 * Client for the SponsorBlock public API.
 * SponsorBlock is a community-driven database of crowd-sourced video segments
 * (sponsor spots, intros, outros, etc.) that users have submitted for skipping.
 *
 * API docs: https://wiki.sponsor.ajay.app/w/API_Docs
 *
 * This is entirely opt-in — only called when the user has enabled
 * SponsorBlock in Settings. No data is sent about what the user watches.
 */

import type { SponsorCategory } from '../store/useAppStore'

/** A single sponsor segment with start/end timestamps in seconds */
export interface SponsorSegment {
  /** Start time in seconds */
  startTime: number
  /** End time in seconds */
  endTime: number
  /** Category of this segment (e.g. "sponsor", "intro") */
  category: SponsorCategory
  /** Human-readable action hint — usually "skip" */
  actionType: string
  /** Unique ID for this segment in the SponsorBlock database */
  UUID: string
}

/** SponsorBlock API base URL — uses the public community instance */
const SPONSORBLOCK_API = 'https://sponsor.ajay.app/api'

/**
 * Fetches sponsor segments for a YouTube video from the SponsorBlock API.
 *
 * @param videoId - YouTube video ID (e.g. "dQw4w9WgXcQ")
 * @param categories - Which segment categories to fetch
 * @returns Array of segments, or empty array if none found or API fails
 */
export async function fetchSponsorSegments(
  videoId: string,
  categories: SponsorCategory[]
): Promise<SponsorSegment[]> {
  if (!videoId || categories.length === 0) return []

  try {
    // Build category query param — SponsorBlock expects JSON array format
    const categoryParam = JSON.stringify(categories)
    const url = `${SPONSORBLOCK_API}/skipSegments?videoID=${videoId}&categories=${encodeURIComponent(categoryParam)}`

    const response = await fetch(url)

    // 404 means no segments exist for this video — not an error
    if (response.status === 404) return []
    if (!response.ok) throw new Error(`SponsorBlock API error: ${response.status}`)

    const data: SponsorSegment[] = await response.json()
    return data
  } catch (err) {
    // Silently fail — SponsorBlock being down should never break video playback
    console.warn('[SponsorBlock] Failed to fetch segments:', err)
    return []
  }
}
