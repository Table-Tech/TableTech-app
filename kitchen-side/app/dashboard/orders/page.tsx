"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiClient } from '@/shared/services/api-client';
import { Clock, Users, ShoppingCart, RefreshCw } from 'lucide-react';


interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  totalAmount: number;
  table: {
    id: string;
    number: number;
    code: string;
  };
  orderItems: Array<{
    id: string;
    quantity: number;
    price: number;
    notes?: string;
    menuItem: {
      id: string;
      name: string;
      preparationTime?: number;
    };
    modifiers: Array<{
      modifier: {
        id: string;
        name: string;
        price: number;
      };
    }>;
  }>;
}

export default function OrdersPage() {
  const { currentRestaurantId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!currentRestaurantId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get all orders using the apiClient which returns ApiResponse<T>
      const response = await apiClient.getOrders(currentRestaurantId);
      
      if (response.success && response.data && response.data.orders && Array.isArray(response.data.orders)) {
        // Filter for active orders only
        const activeOrders = response.data.orders.filter(order => 
          ['CONFIRMED', 'PREPARING', 'READY'].includes(order.status)
        );
        setOrders(activeOrders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [currentRestaurantId]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      // Refresh orders after status update
      await fetchOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'PREPARING': return 'bg-yellow-100 text-yellow-800';
      case 'READY': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'CONFIRMED': return 'PREPARING';
      case 'PREPARING': return 'READY';
      case 'READY': return 'COMPLETED';
      default: return null;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateTotalItems = (orderItems: Order['orderItems']) => {
    return orderItems.reduce((total, item) => total + item.quantity, 0);
  };

  useEffect(() => {
    fetchOrders();
  }, [currentRestaurantId, fetchOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchOrders}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Orders</h1>
          <p className="text-gray-600 mt-1">Manage active restaurant orders</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No active orders
          </h3>
          <p className="text-gray-500">
            New orders will appear here when customers place them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const nextStatus = getNextStatus(order.status);
            
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-600" />
                        Table {order.table.number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Order #{order.orderNumber}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 space-x-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatTime(order.createdAt)}
                    </div>
                    <div className="flex items-center">
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      {calculateTotalItems(order.orderItems)} items
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6 space-y-3">
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="border-l-4 border-blue-100 pl-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            <span className="text-blue-600 font-bold">{item.quantity}x</span> {item.menuItem.name}
                          </p>
                          
                          {item.modifiers.length > 0 && (
                            <div className="mt-1">
                              {item.modifiers.map((mod, index) => (
                                <span
                                  key={index}
                                  className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mr-1 mb-1"
                                >
                                  + {mod.modifier.name}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {item.notes && (
                            <p className="text-sm text-orange-600 mt-1 font-medium">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                        
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                {nextStatus && (
                  <div className="p-6 pt-0">
                    <button
                      onClick={() => updateOrderStatus(order.id, nextStatus)}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Mark as {nextStatus}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}