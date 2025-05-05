'use client'

import { useParams } from 'next/navigation'
import { mockOrders, Order } from '@/lib/mockdata'

export default function StatisticsPage() {
  const params = useParams()
  const restaurantId = params?.restaurantId as string
  const orders: Order[] = mockOrders[restaurantId] || []

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, order) => {
    return sum + order.items.length * 10 // stel: elke item kost €10
  }, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#12395B] mb-6">Statistieken</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-medium text-[#12395B]">Aantal bestellingen</h2>
          <p className="text-3xl text-gray-800">{totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-medium text-[#12395B]">Totale omzet</h2>
          <p className="text-3xl text-gray-800">€{totalRevenue.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
