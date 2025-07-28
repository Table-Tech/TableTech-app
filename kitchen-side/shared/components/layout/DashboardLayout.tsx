'use client'

import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  Table2,
  Utensils,
  BarChart,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  ChevronRight,
  ShoppingCart
} from 'lucide-react'
import { useAuth } from '@/shared/hooks/useAuth'
import { ErrorBoundary } from '@/shared/components/error'

const navItems = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Orders', icon: ShoppingCart, path: '/dashboard/orders' },
  { label: 'Tables', icon: Table2, path: '/dashboard/tables' },
  { label: 'Menu', icon: Utensils, path: '/dashboard/menu' },
  { label: 'Analytics', icon: BarChart, path: '/dashboard/statistics' },
  { label: 'Settings', icon: Settings, path: '/dashboard/beheer' },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout = React.memo(({ children }: DashboardLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isLoading, selectedRestaurant, clearRestaurantSelection } = useAuth()

  const handleLogout = () => {
    logout()
  }

  const handleBackToSelect = () => {
    clearRestaurantSelection()
    setIsMobileMenuOpen(false)
  }

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
            TT
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">TableTech</h1>
            {(user?.restaurant?.name || selectedRestaurant?.name) && (
              <p className="text-xs text-gray-500">{user?.restaurant?.name || selectedRestaurant?.name}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
          <SidebarContent
            user={user}
            navItems={navItems}
            pathname={pathname}
            selectedRestaurant={selectedRestaurant}
            onLogout={handleLogout}
            onBackToSelect={handleBackToSelect}
          />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={closeMobileMenu} />
            <div className="relative flex flex-col w-64 bg-white">
              <SidebarContent
                user={user}
                navItems={navItems}
                pathname={pathname}
                selectedRestaurant={selectedRestaurant}
                onLogout={handleLogout}
                onBackToSelect={handleBackToSelect}
                onNavigate={closeMobileMenu}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:pl-64">
          <ErrorBoundary
            level="section"
            name="MainContent"
          >
            <div className="p-4 lg:p-8">
              {children}
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
})

interface SidebarContentProps {
  user: any
  navItems: any[]
  pathname: string
  selectedRestaurant: any
  onLogout: () => void
  onBackToSelect: () => void
  onNavigate?: () => void
}

const SidebarContent = ({
  user,
  navItems,
  pathname,
  selectedRestaurant,
  onLogout,
  onBackToSelect,
  onNavigate
}: SidebarContentProps) => {
  return (
    <>
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold">
            TT
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">TableTech</h1>
            {(user?.restaurant?.name || selectedRestaurant?.name) ? (
              <p className="text-sm text-gray-500 mt-1">{user?.restaurant?.name || selectedRestaurant?.name}</p>
            ) : user?.role === 'SUPER_ADMIN' ? (
              <p className="text-sm text-orange-500 mt-1">Select restaurant</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ label, icon: Icon, path }) => {
          const href = path
          const isActive = pathname === href

          return (
            <Link
              key={label}
              href={href}
              onClick={onNavigate}
              className={`
                group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span>{label}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-blue-600" />}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 p-4 space-y-4">
        {/* User Info */}
        {user && (
          <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
            <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {user.role.toLowerCase().replace('_', ' ')}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {user?.role === 'SUPER_ADMIN' && (
            <button
              onClick={onBackToSelect}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>Switch Restaurant</span>
            </button>
          )}
          
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  )
}

DashboardLayout.displayName = 'DashboardLayout'