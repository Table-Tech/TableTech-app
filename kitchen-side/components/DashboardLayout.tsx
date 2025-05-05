'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const restaurantId = params?.restaurantId as string

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-white border-r p-4 shadow-sm">
        <h2 className="text-2xl font-bold text-[#12395B] mb-6">TableTech</h2>
        <nav className="flex flex-col space-y-3">
          <Link href={`/dashboard/${restaurantId}`} className="text-[#12395B] hover:text-blue-600">Home</Link>
          <Link href={`/dashboard/${restaurantId}/menu`} className="text-[#12395B] hover:text-blue-600">Menu</Link>
          <Link href={`/dashboard/${restaurantId}/statistics`} className="text-[#12395B] hover:text-blue-600">Statistieken</Link>
        </nav>
      </aside>
      <main className="flex-1 bg-[#F6FCFF] p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
