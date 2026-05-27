/**
 * App.tsx
 *
 * Root application component. Sets up:
 * - React Router with all page routes
 * - Global layout (Navbar + Sidebar + main content area)
 * - Theme class on the root div (dark/light)
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import Navbar        from './components/layout/Navbar'
import Sidebar       from './components/layout/Sidebar'

// Pages
import Home          from './pages/Home'
import Watch         from './pages/Watch'
import Search        from './pages/Search'
import Channel       from './pages/Channel'
import History       from './pages/History'
import Watchlist     from './pages/Watchlist'
import Library       from './pages/Library'
import PlaylistView  from './pages/PlaylistView'
import Subscriptions from './pages/Subscriptions'
import Feed          from './pages/Feed'
import Downloads     from './pages/Downloads'
import Settings      from './pages/Settings'

export default function App() {
  const theme = useAppStore(s => s.theme)

  return (
    // Apply theme class to root — Tailwind dark mode uses this
    <div className={theme}>
      <BrowserRouter>
        <div className="flex flex-col h-screen bg-neutral-950 text-white">

          {/* Top navigation bar */}
          <Navbar />

          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar */}
            <Sidebar />

            {/* Main scrollable content area */}
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/"               element={<Home />}          />
                <Route path="/watch"          element={<Watch />}         />
                <Route path="/watch/:id"      element={<Watch />}         />
                <Route path="/search"         element={<Search />}        />
                <Route path="/channel/:id"    element={<Channel />}       />
                <Route path="/history"        element={<History />}       />
                <Route path="/watchlist"      element={<Watchlist />}     />
                <Route path="/library"        element={<Library />}       />
                <Route path="/playlist/:id"   element={<PlaylistView />}  />
                <Route path="/subscriptions"  element={<Subscriptions />} />
                <Route path="/feed"           element={<Feed />}          />
                <Route path="/downloads"      element={<Downloads />}     />
                <Route path="/settings"       element={<Settings />}      />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </div>
  )
}
