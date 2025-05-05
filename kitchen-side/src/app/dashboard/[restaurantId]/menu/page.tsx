'use client'

import { useParams } from 'next/navigation'
import { mockMenuItems, MenuItem } from '@/lib/mockdata'

export default function MenuPage() {
  const params = useParams()
  const restaurantId = params?.restaurantId as string
  const menu: MenuItem[] = mockMenuItems[restaurantId] || []

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#12395B] mb-4">Menu</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menu.map(item => (
          <div key={item.id} className="p-4 bg-white shadow rounded-lg">
            <h2 className="font-semibold text-[#12395B]">{item.title}</h2>
            <p className="text-gray-600">€{item.price}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
