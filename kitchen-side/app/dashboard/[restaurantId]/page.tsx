"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  table: {
    number: string;
  };
  menuItems: OrderItem[];
  status: string;
  createdAt: string;
};

const API_URL = "http://localhost:3001";

export default function OrdersPage() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!restaurantId) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/orders?restaurantId=${restaurantId}`, {
        headers
      });
      
      const data = await res.json();
      console.log('API Response:', data); // Debug log
      
      if (res.ok) {
        // Handle different response structures
        if (Array.isArray(data)) {
          setOrders(data);
        } else if (data.success && Array.isArray(data.data)) {
          setOrders(data.data);
        } else if (Array.isArray(data.orders)) {
          setOrders(data.orders);
        } else {
          console.error("Unexpected response structure:", data);
          setOrders([]);
        }
      } else {
        console.error("Failed to fetch orders:", data);
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Update local state
        setOrders(orders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        ));
      } else {
        console.error("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'complete':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'preparing':
        return 'preparing';
      case 'ready':
        return 'ready';
      case 'complete':
      case 'completed':
        return 'complete';
      case 'cancelled':
        return 'cancelled';
      default:
        return status;
    }
  };

  const calculateTotal = (items: OrderItem[]) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("nl-NL", {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (restaurantId) {
      fetchOrders();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [restaurantId]);

  if (!restaurantId) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <h1 className="text-2xl font-bold text-[#12395B] mb-6">Live Orders</h1>
        <p className="text-gray-500">Restaurant ID niet gevonden.</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <h1 className="text-2xl font-bold text-[#12395B] mb-6">Live Orders</h1>
      
      {loading ? (
        <p className="text-gray-500">Bestellingen laden...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">Geen bestellingen gevonden.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Tafel {order.table?.number || "–"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Order ID: {order.id.slice(-6)}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}
                >
                  {getStatusText(order.status)}
                </span>
              </div>

              {/* Items */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Aantal items: {order.menuItems?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                </p>
                <div className="space-y-1">
                  {order.menuItems?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="text-gray-900 font-medium">
                        €{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  )) || <p className="text-sm text-gray-500">Geen items</p>}
                </div>
              </div>

              {/* Total and Time */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Totaal:</span>
                  <span className="text-lg font-bold text-gray-900">
                    €{calculateTotal(order.menuItems || []).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Besteld om: {formatTime(order.createdAt)}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-1">
                  {order.status.toLowerCase() === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status.toLowerCase() === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-xs font-medium"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status.toLowerCase() === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'complete')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium"
                    >
                      Complete
                    </button>
                  )}
                  {!['complete', 'completed', 'cancelled'].includes(order.status.toLowerCase()) && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium ml-auto"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}