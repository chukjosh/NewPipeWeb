/**
 * Sidebar.tsx
 *
 * Left navigation sidebar. Highlights the active route automatically.
 * Hidden on mobile (< md breakpoint) — mobile nav can be added later.
 */

import { NavLink } from 'react-router-dom'
import {
  Home, Rss, Bell, BookMarked,
  Clock, ListVideo, HardDrive, Settings,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/',              icon: Home,       label: 'Home'          },
  { to: '/feed',          icon: Rss,        label: 'Feed'          },
  { to: '/subscriptions', icon: Bell,       label: 'Subscriptions' },
  { to: '/watchlist',     icon: BookMarked, label: 'Watchlist'     },
  { to: '/history',       icon: Clock,      label: 'History'       },
  { to: '/library',       icon: ListVideo,  label: 'Library'       },
  { to: '/downloads',     icon: HardDrive,  label: 'Downloads'     },
]

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-neutral-900 border-r border-neutral-800
                      flex flex-col py-4 overflow-y-auto hidden md:flex">

      {/* Main navigation items */}
      <nav className="flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg',
                'text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Settings at the bottom, separated */}
      <div className="border-t border-neutral-800 pt-2 mt-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg',
              'text-sm font-medium transition-colors duration-150',
              isActive
                ? 'bg-red-600 text-white'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            )
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
