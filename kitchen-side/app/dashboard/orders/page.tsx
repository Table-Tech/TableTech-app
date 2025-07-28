"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiClient } from '@/shared/services/api-client';
import { useWebSocket } from '@/shared/services/websocket-client';
import { Clock, Users, ShoppingCart, RefreshCw, Wifi, WifiOff, TestTube } from 'lucide-react';


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
  const { connectionStatus, subscribe, updateOrderStatus: wsUpdateOrderStatus } = useWebSocket(currentRestaurantId || undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testOrderLoading, setTestOrderLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!currentRestaurantId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching orders for restaurant:', currentRestaurantId);
      
      // Get all orders using the apiClient which returns ApiResponse<T>
      const response = await apiClient.getOrders(currentRestaurantId);
      
      console.log('📨 Raw API response:', response);
      
      // The API returns orders directly in data, not in data.orders
      const ordersArray = Array.isArray(response.data) ? response.data : (response.data?.orders || []);
      
      if (response.success && ordersArray && Array.isArray(ordersArray)) {
        console.log('📋 All orders from API:', ordersArray);
        console.log('📊 Total orders count:', ordersArray.length);
        
        // Log each order's details
        ordersArray.forEach((order, index) => {
          console.log(`📝 Order ${index + 1}:`, {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            tableNumber: order.table?.number,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt
          });
        });
        
        // Filter for active orders only
        const activeOrders = ordersArray.filter(order => 
          ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)
        );
        
        console.log('✅ Active orders after filtering:', activeOrders);
        console.log('🎯 Setting orders state with count:', activeOrders.length);
        
        setOrders(activeOrders);
      } else {
        console.log('❌ Invalid response structure:', { 
          success: response.success, 
          hasData: !!response.data, 
          dataType: typeof response.data,
          isDataArray: Array.isArray(response.data),
          hasOrders: !!(response.data?.orders), 
          isOrdersArray: Array.isArray(response.data?.orders) 
        });
        setOrders([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [currentRestaurantId]);

  const createTestOrder = async () => {
    if (!currentRestaurantId) return;
    
    setTestOrderLoading(true);
    try {
      // Using known IDs from our previous data
      const tableId = "2706fe77-4c9a-420d-b70e-62641bd35e64";
      const menuItemId = "b77c704d-fcfd-494e-a262-bb82fcf0bfcc";
      
      const response = await apiClient.createTestOrder(currentRestaurantId, tableId, menuItemId);
      
      if (response.success) {
        console.log('Test order created successfully:', response.data);
        // The WebSocket should automatically update the UI
      } else {
        console.error('Failed to create test order:', response.error);
        alert('Failed to create test order: ' + response.error);
      }
    } catch (error) {
      console.error('Error creating test order:', error);
      alert('Error creating test order');
    } finally {
      setTestOrderLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      // Also emit via WebSocket for real-time update to other clients
      wsUpdateOrderStatus(orderId, newStatus);
      // Refresh orders after status update
      await fetchOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-orange-100 text-orange-800';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'PREPARING': return 'bg-yellow-100 text-yellow-800';
      case 'READY': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING': return 'CONFIRMED';
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

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    if (!currentRestaurantId) return;

    // Subscribe to new orders
    const unsubscribeNewOrder = subscribe('order:new', (data) => {
      const order = data.order;
      console.log('🔔 WebSocket - New order received:', data);
      console.log('🔔 Order status:', order.status);
      console.log('🔔 Will show?', ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status));
      
      // Add new order to the list if it's in an active status
      if (['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) {
        setOrders(prev => {
          // Check if order already exists to avoid duplicates
          const exists = prev.some(o => o.id === order.id);
          console.log('🔔 Order exists in state?', exists);
          console.log('🔔 Current orders count:', prev.length);
          
          if (exists) return prev;
          const newOrders = [order, ...prev];
          console.log('🔔 Adding order, new count:', newOrders.length);
          return newOrders;
        });
      } else {
        console.log('🔔 Order filtered out due to status:', order.status);
      }
    });

    // Subscribe to order status updates
    const unsubscribeStatusUpdate = subscribe('order:status', ({ orderId, status }) => {
      console.log('Order status update:', orderId, status);
      setOrders(prev => prev.map(order => {
        if (order.id === orderId) {
          // If status is COMPLETED or CANCELLED, remove from active orders
          if (status === 'COMPLETED' || status === 'CANCELLED') {
            return null;
          }
          return { ...order, status };
        }
        return order;
      }).filter(Boolean) as Order[]);
    });

    // Subscribe to order cancellations
    const unsubscribeOrderCancelled = subscribe('order:cancelled', ({ orderId }) => {
      console.log('Order cancelled:', orderId);
      setOrders(prev => prev.filter(order => order.id !== orderId));
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeNewOrder();
      unsubscribeStatusUpdate();
      unsubscribeOrderCancelled();
    };
  }, [currentRestaurantId, subscribe]);

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
        <div className="flex items-center space-x-4">
          {/* Connection Status Indicator */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">Offline</span>
              </>
            )}
          </div>
          <button
            onClick={createTestOrder}
            disabled={testOrderLoading}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <TestTube className="w-4 h-4" />
            <span>{testOrderLoading ? 'Creating...' : 'Test Order'}</span>
          </button>
          <button
            onClick={fetchOrders}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
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