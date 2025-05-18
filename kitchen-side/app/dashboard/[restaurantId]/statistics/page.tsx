"use client";

import { useParams } from "next/navigation";
import { mockOrders, Order } from "lib/mockdata";

export default function StatisticsPage() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;
  const orders: Order[] = mockOrders[restaurantId] || [];

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => {
    return sum + order.items.length * 10; // stel: elke item kost €10
  }, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#12395B] mb-6">Statistieken</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-medium text-[#12395B]">
            Aantal bestellingen
          </h2>
          <p className="text-3xl text-gray-800">{totalOrders}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-md shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1 text-[#12395B]">Totale winst</p>
                <h3 className="text-2xl font-bold text-[#12395B]">€{totalRevenue.toFixed(2)}</h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-md shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1 text-[#12395B]">Totale bestellingen</p>
                <h3 className="text-2xl font-bold text-[#12395B]">{totalOrders}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-md shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Gemiddelde bestelling</p>
                <h3 className="text-2xl font-bold text-[#12395B]">€{averageOrderValue.toFixed(2)}</h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-md shadow-md lg:col-span-2">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-2 text-[#12395B]">Verkoop overzicht</h2>
              <div className="h-80 flex items-center justify-center bg-gray-50 rounded-md">
                <p className="text-gray-500">Sales chart visualization would appear here</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md shadow-md">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-semibold mb-2 text-[#12395B]">Best verkochte items</h2>
              {topSelling.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#12395B]">{item.name}</p>
                    <p className="text-sm text-gray-500 text-[#12395B]">{item.sales} verkocht</p>
                  </div>
                  <p className="font-bold text-[#12395B]">€{item.revenue.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-md shadow-md">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-semibold mb-2 text-[#12395B]">Recente Transacties</h2>
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#12395B]">{transaction.id}</p>
                    <p className="text-sm text-[#12395B]">{transaction.items}</p>
                  </div>
                  <p className="font-bold text-[#12395B]">{transaction.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
