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
  ShoppingCart,
} from 'lucide-react'
import { useAuth } from '@/shared/hooks/useAuth'
import { useTranslation } from '@/shared/contexts/LanguageContext'
import { ErrorBoundary } from '@/shared/components/error'

// Navigation items with translation keys and role restrictions
const getAllNavItems = (t: any) => [
  { labelKey: 'dashboard', icon: Home, path: '/dashboard', roles: [] }, // Available to all
  { labelKey: 'orders', icon: ShoppingCart, path: '/dashboard/orders', roles: [] }, // Available to all
  { labelKey: 'tables', icon: Table2, path: '/dashboard/tables', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
  { labelKey: 'menu', icon: Utensils, path: '/dashboard/menu', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CHEF'] },
  { labelKey: 'analytics', icon: BarChart, path: '/dashboard/statistics', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
  { labelKey: 'settings', icon: Settings, path: '/dashboard/beheer', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
]

// Filter navigation items based on user role
const getNavItems = (t: any, userRole?: string) => {
  const allItems = getAllNavItems(t)
  if (!userRole) return allItems
  
  return allItems.filter(item => 
    item.roles.length === 0 || item.roles.includes(userRole as any)
  )
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout = React.memo(({ children }: DashboardLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isLoading, selectedRestaurant, clearRestaurantSelection } = useAuth()
  const t = useTranslation()
  const navItems = getNavItems(t, user?.role)

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
        
        <div className="flex items-center space-x-2">
          {/* Mobile User Avatar with Logout */}
          {user && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-semibold text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                title={t.nav.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
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
  const t = useTranslation()
  
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
              <p className="text-sm text-orange-500 mt-1">{t.nav.selectRestaurant}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ labelKey, icon: Icon, path }) => {
          const href = path
          const isActive = pathname === href
          const label = t.nav[labelKey as keyof typeof t.nav]

          return (
            <Link
              key={labelKey}
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
              <span>{t.nav.switchRestaurant}</span>
            </button>
          )}
          
          {/* Logout Button - Available to all authenticated users */}
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.nav.logout}</span>
          </button>
        </div>
      </div>
    </>
  )
}

DashboardLayout.displayName = 'DashboardLayout'