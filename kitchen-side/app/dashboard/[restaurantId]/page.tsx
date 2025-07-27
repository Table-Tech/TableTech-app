"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { KitchenOrder } from "@/lib/types";

export default function DashboardPage() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!restaurantId) return;
      
      try {
        setIsLoading(true);
        const response = await apiClient.getKitchenOrders(restaurantId);
        
        if (response.success && response.data) {
          setOrders(response.data);
        } else {
          setError('Failed to fetch orders');
        }
      } catch (error) {
        setError('Network error');
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [restaurantId]);

  if (isLoading) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <h1 className="text-2xl font-bold text-[#0a3c6e] mb-6">Live Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders at the moment</h3>
          <p className="text-gray-600">
            Orders will appear here when customers place them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-5 rounded-xl shadow-md border border-slate-100"
            >
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#0a3c6e]">
                    Tafel {order.table.number}
                  </h2>
                  <p className="text-sm text-slate-500">Order #{order.orderNumber}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === "CONFIRMED"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Aantal items: {order.orderItems.length}
              </p>
              <div className="mt-3 space-y-1">
                {order.orderItems.map((item) => (
                  <div key={item.id} className="text-sm text-slate-600">
                    {item.quantity}x {item.menuItem.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
