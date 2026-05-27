/**
 * Navbar.tsx
 *
 * Top navigation bar containing:
 * - App logo / home button
 * - Service selector (YouTube, SoundCloud, PeerTube, etc.)
 * - Search input
 * - Downloads shortcut
 * - Theme toggle
 *
 * The selected service is stored in the URL as ?service= so it persists
 * across navigation and can be bookmarked.
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Sun, Moon, Download } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import ServiceSelector from '../common/ServiceSelector'

export default function Navbar() {
  const [query, setQuery]         = useState('')
  const navigate                  = useNavigate()
  const [searchParams]            = useSearchParams()
  const { theme, toggleTheme, addRecentSearch } = useAppStore()

  // Preserve the currently selected service across searches
  const [service, setService] = useState(
    searchParams.get('service') ?? 'youtube'
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    addRecentSearch(query.trim())
    navigate(`/search?q=${encodeURIComponent(query.trim())}&service=${service}`)
  }

  return (
    <nav className="h-14 bg-neutral-900 border-b border-neutral-800
                    flex items-center px-4 gap-3 z-50 shrink-0">

      {/* Logo / home button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 shrink-0"
        aria-label="Go home"
      >
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">N</span>
        </div>
        <span className="font-bold text-lg hidden sm:block">NewPipeWeb</span>
      </button>

      {/* Service selector + search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto flex gap-2">

        {/* Service dropdown */}
        <ServiceSelector value={service} onChange={setService} />

        {/* Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${service === 'youtube' ? 'YouTube' : service}...`}
            className="input pr-12"
            aria-label="Search"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2
                       p-1.5 hover:bg-neutral-700 rounded-lg transition-colors"
            aria-label="Submit search"
          >
            <Search size={18} className="text-neutral-400" />
          </button>
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">

        {/* Downloads shortcut */}
        <button
          onClick={() => navigate('/downloads')}
          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          title="Downloads"
          aria-label="Go to downloads"
        >
          <Download size={20} className="text-neutral-400" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          title="Toggle theme"
          aria-label="Toggle dark/light mode"
        >
          {theme === 'dark'
            ? <Sun  size={20} className="text-neutral-400" />
            : <Moon size={20} className="text-neutral-400" />
          }
        </button>
      </div>
    </nav>
  )
}
