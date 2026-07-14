/**
 * Settings.tsx
 *
 * User-configurable settings page. All values are persisted to localStorage
 * via the Zustand store (useAppStore).
 *
 * Sections:
 * - Appearance (theme)
 * - Player defaults (quality, playback rate, subtitles)
 * - SponsorBlock (opt-in, category selection)
 * - Privacy (clear history, clear searches)
 */

import React from 'react';
// import { useNavigate } from 'react-router-dom' // Commented out to fix TS6133
import { Trash2, SkipForward, Info } from 'lucide-react'
import {
  useAppStore,
  SPONSOR_CATEGORY_LABELS,
  type SponsorCategory,
} from '../store/useAppStore'
import { useClearHistory, useStorageSettings, useUpdateStorageSettings } from '../hooks'

/** All available SponsorBlock categories in display order */
const ALL_CATEGORIES: SponsorCategory[] = [
  'sponsor',
  'selfpromo',
  'interaction',
  'intro',
  'outro',
  'preview',
  'music_offtopic',
  'filler',
]

/** Available playback speeds */
const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

/** Common quality options */
const QUALITY_OPTIONS = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']

export default function Settings() {
  // const navigate = useNavigate() // Commented out to fix TS6133
  const clearHistory = useClearHistory()

  // Pull storage settings and explicitly cast type to resolve TS2339
  const { data: storageSettings } = useStorageSettings() as {
    data: { downloadsDir: string; dataDir: string; trendingCountry?: string } | undefined
  }
  const updateSettings = useUpdateStorageSettings()
  const trendingCountry = storageSettings?.trendingCountry ?? 'US'
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value
    updateSettings.mutate({ trendingCountry: newCountry })
  }

  // Pull all relevant state from the store
  const {
    theme, toggleTheme,
    playbackRate, setPlaybackRate,
    preferredQuality, setPreferredQuality,
    subtitlesEnabled, setSubtitlesEnabled,
    preferredSubtitleLang, setPreferredSubtitleLang,
    sponsorBlockEnabled, setSponsorBlockEnabled,
    sponsorBlockCategories, setSponsorBlockCategories,
    recentSearches, clearRecentSearches,
  } = useAppStore()

  /** Toggle a SponsorBlock category on/off */
  const toggleCategory = (cat: SponsorCategory) => {
    if (sponsorBlockCategories.includes(cat)) {
      // Don't allow removing all categories — keep at least one
      if (sponsorBlockCategories.length === 1) return
      setSponsorBlockCategories(sponsorBlockCategories.filter(c => c !== cat))
    } else {
      setSponsorBlockCategories([...sponsorBlockCategories, cat])
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* ── Appearance ──────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-neutral-200">Appearance</h2>
        <div className="bg-neutral-900 rounded-xl p-4 space-y-4">

          {/* Trending country selector */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Trending Country</p>
              <p className="text-xs text-neutral-400 mt-0.5">Default is US. Change to view other region trends.</p>
            </div>
            <select
              value={trendingCountry}
              onChange={handleCountryChange}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-red-500"
            >
              {/* Add more country codes as needed */}
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="JP">Japan</option>
              <option value="AU">Australia</option>
            </select>
          </div>

          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-neutral-400 mt-0.5">Choose between dark and light mode</p>
            </div>
            <button onClick={toggleTheme} className="btn-secondary text-sm">
              {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Player defaults ──────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-neutral-200">Player</h2>
        <div className="bg-neutral-900 rounded-xl p-4 space-y-5">

          {/* Preferred quality */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Preferred quality</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Applied automatically when opening a video
              </p>
            </div>
            <select
              value={preferredQuality}
              onChange={e => setPreferredQuality(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5
                         text-sm text-white outline-none focus:border-red-500"
            >
              {QUALITY_OPTIONS.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          {/* Playback speed */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Default playback speed</p>
              <p className="text-xs text-neutral-400 mt-0.5">Videos will start at this speed</p>
            </div>
            <select
              value={playbackRate}
              onChange={e => setPlaybackRate(Number(e.target.value))}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5
                         text-sm text-white outline-none focus:border-red-500"
            >
              {PLAYBACK_SPEEDS.map(s => (
                <option key={s} value={s}>{s}x</option>
              ))}
            </select>
          </div>

          {/* Subtitles */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Show subtitles by default</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Automatically enable CC when subtitles are available
              </p>
            </div>
            <ToggleSwitch
              checked={subtitlesEnabled}
              onChange={() => setSubtitlesEnabled(!subtitlesEnabled)}
            />
          </div>

          {/* Subtitle language */}
          {subtitlesEnabled && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Preferred subtitle language</p>
                <p className="text-xs text-neutral-400 mt-0.5">ISO 639-1 language code (e.g. en, fr, de)</p>
              </div>
              <input
                type="text"
                value={preferredSubtitleLang}
                onChange={e => setPreferredSubtitleLang(e.target.value.toLowerCase().slice(0, 5))}
                maxLength={5}
                placeholder="en"
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5
                           text-sm text-white outline-none focus:border-red-500 w-20 text-center"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── SponsorBlock ─────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-1 text-neutral-200 flex items-center gap-2">
          <SkipForward size={18} className="text-yellow-400" />
          SponsorBlock
        </h2>
        <p className="text-xs text-neutral-400 mb-4">
          SponsorBlock is a community-driven database that lets you automatically skip
          sponsored segments, intros, outros, and more. Your viewing data is{' '}
          <span className="text-neutral-200">never sent</span> to SponsorBlock — only
          the video ID is used to fetch segment timestamps.{' '}
          <a
            href="https://sponsor.ajay.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:underline"
          >
            Learn more ↗
          </a>
        </p>

        <div className="bg-neutral-900 rounded-xl p-4 space-y-5">

          {/* Master enable/disable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable SponsorBlock</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Automatically skip selected segment types while watching
              </p>
            </div>
            <ToggleSwitch
              checked={sponsorBlockEnabled}
              onChange={() => setSponsorBlockEnabled(!sponsorBlockEnabled)}
            />
          </div>

          {/* Category checkboxes — only shown when SponsorBlock is enabled */}
          {sponsorBlockEnabled && (
            <div>
              <p className="text-xs text-neutral-400 mb-3 uppercase tracking-wide font-medium">
                Segment categories to skip
              </p>
              <div className="space-y-2">
                {ALL_CATEGORIES.map(cat => (
                  <label
                    key={cat}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={sponsorBlockCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                    />
                    <span className="text-sm text-neutral-200 group-hover:text-white transition-colors">
                      {SPONSOR_CATEGORY_LABELS[cat]}
                    </span>
                  </label>
                ))}
              </div>

              {/* Info note */}
              <div className="mt-4 flex gap-2 text-xs text-neutral-400 bg-neutral-800 rounded-lg p-3">
                <Info size={14} className="shrink-0 mt-0.5 text-blue-400" />
                <span>
                  Segments are fetched from{' '}
                  <span className="text-neutral-200">sponsor.ajay.app</span>{' '}
                  using only the video ID. No watch history or personal data is shared.
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Privacy / Data ───────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-neutral-200">Privacy & Data</h2>
        <div className="bg-neutral-900 rounded-xl p-4 space-y-4">

          {/* Clear watch history */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Watch history</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Stored locally in the app database, never sent anywhere
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Clear all watch history?')) clearHistory.mutate()
              }}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Trash2 size={13} /> Clear history
            </button>
          </div>

          {/* Clear recent searches */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Recent searches</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {recentSearches.length} saved search{recentSearches.length !== 1 ? 'es' : ''}
              </p>
            </div>
            <button
              onClick={clearRecentSearches}
              className="btn-secondary text-sm flex items-center gap-1.5"
              disabled={recentSearches.length === 0}
            >
              <Trash2 size={13} /> Clear searches
            </button>
          </div>
        </div>
      </section>

      {/* ── About ────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-neutral-200">About</h2>
        <div className="bg-neutral-900 rounded-xl p-4 space-y-2 text-sm text-neutral-400">
          <p><span className="text-neutral-200 font-medium">NewPipe Web</span> v1.0.0</p>
          <p>Powered by <span className="text-neutral-200">NewPipeExtractor v0.26.0</span></p>
          <p>
            <a
              href="https://github.com/TeamNewPipe/NewPipeExtractor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:underline"
            >
              NewPipeExtractor on GitHub ↗
            </a>
          </p>
          <p className="text-xs pt-2">
            This project is not affiliated with Google or YouTube.
            It uses publicly available data via reverse-engineered APIs.
          </p>
        </div>
      </section>
    </div>
  )
}

// ─── Reusable toggle switch component ──────────────────────
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0
        ${checked ? 'bg-red-600' : 'bg-neutral-600'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                    transition-transform duration-200
                    ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}
