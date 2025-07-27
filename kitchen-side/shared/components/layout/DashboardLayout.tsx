/**
 * DashboardLayout Component
 * Main layout wrapper for dashboard pages with sidebar navigation
 */

'use client'

import React from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  Table2,
  Utensils,
  BarChart,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/shared/hooks/useAuth'

const navItems = [
  { label: 'Dashboard', icon: Home, path: '' },
  { label: 'Tables', icon: Table2, path: '/tables' },
  { label: 'Menu', icon: Utensils, path: '/menu' },
  { label: 'Statistics', icon: BarChart, path: '/statistics' },
  { label: 'Settings', icon: Settings, path: '/beheer' },
]

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = React.memo(({ children }: DashboardLayoutProps) => {
  const { restaurantId } = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
  }

  const handleBackToSelect = () => {
    router.push('/select')
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa]">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo and Restaurant Info */}
        <div className="p-6 bg-[#12395B] text-white">
          <h1 className="text-2xl font-bold">TableTech</h1>
          {user?.restaurant && (
            <p className="text-sm text-blue-100 mt-1">{user.restaurant.name}</p>
          )}
          {!user?.restaurant && user?.role === 'SUPER_ADMIN' && (
            <p className="text-sm text-orange-300 mt-1">Select a restaurant</p>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map(({ label, icon: Icon, path }) => {
              const href = `/dashboard/${restaurantId}${path}`
              const isActive = pathname === href

              return (
                <li key={label}>
                  <Link
                    href={href}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-[#12395B] text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-[#12395B]'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span>{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Info and Actions */}
        <div className="bg-gray-50 border-t border-gray-200">
          {/* User Info */}
          {user && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#12395B] text-white rounded-full flex items-center justify-center font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.role.toLowerCase().replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-4 space-y-2">
            {user?.role === 'SUPER_ADMIN' && (
              <button
                onClick={handleBackToSelect}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg transition-colors duration-200"
              >
                <Building2 className="w-4 h-4" />
                <span className="text-sm">Change Restaurant</span>
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
})

DashboardLayout.displayName = 'DashboardLayout'