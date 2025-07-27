/**
 * DashboardLayout Component
 * Main layout wrapper for dashboard pages with sidebar navigation
 */

'use client'

import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  Table2,
  Utensils,
  BarChart,
  Settings,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { label: 'Home', icon: Home, path: '' },
  { label: 'Tafels', icon: Table2, path: '/tables' },
  { label: 'Menu', icon: Utensils, path: '/menu' },
  { label: 'Statistieken', icon: BarChart, path: '/statistics' },
  { label: 'Beheer', icon: Settings, path: '/beheer' },
]

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { restaurantId } = useParams()
  const pathname = usePathname()

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-white border-r p-4 shadow-sm">
        <h2 className="text-2xl font-bold text-[#12395B] mb-6">TableTech</h2>
        <nav className="flex flex-col space-y-2">
          {navItems.map(({ label, icon: Icon, path }) => {
            const href = `/dashboard/${restaurantId}${path}`
            const isActive = pathname === href

            return (
              <Link
                key={label}
                href={href}
                className={clsx(
                  'flex items-center px-4 py-2 rounded-lg transition',
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 bg-[#F6FCFF] p-6 overflow-y-auto">{children}</main>
    </div>
  )
}