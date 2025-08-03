"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  MoreVertical,
} from "lucide-react";
import { apiClient } from "@/shared/services/api-client";
import { useWebSocket } from "@/shared/services/websocket-client";
import { LoadingSpinner } from "@/shared/components/ui";
import { useTranslation } from "@/shared/contexts/LanguageContext";

interface DashboardPageProps {
  restaurantId: string;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
}

interface RecentOrderProps {
  id: string;
  displayId: string;
  table: string;
  items: number;
  total: string;
  status: "pending" | "preparing" | "ready" | "completed";
  time: string;
}

const StatCard = ({
  title,
  value,
  icon: Icon,
}: StatCardProps) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
      <button className="text-gray-400 hover:text-gray-600">
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>

    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const RecentOrderRow = ({
  id,
  displayId,
  table,
  items,
  total,
  status,
  time,
}: RecentOrderProps) => {
  const t = useTranslation();
  
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    preparing: "bg-blue-100 text-blue-800 border-blue-200",
    ready: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t.orders.pending;
      case 'preparing': return t.orders.preparing;
      case 'ready': return t.orders.ready;
      case 'completed': return t.orders.completed;
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">#{displayId}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">{t.orders.table} {table}</p>
          <p className="text-sm text-gray-500">
            {items} {t.dashboard.items} • {time}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <span className="font-semibold text-gray-900">{total}</span>
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusColors[status]}`}
        >
          {getStatusText(status)}
        </span>
      </div>
    </div>
  );
};

export const DashboardPage = ({ restaurantId }: DashboardPageProps) => {
  const t = useTranslation();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    activeOrders: 0,
    todayOrders: 0,
    avgOrderValue: 0
  });
  const { subscribe } = useWebSocket(restaurantId);

  // Fetch recent orders and stats
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all orders
        const ordersResponse = await apiClient.getOrders(restaurantId);
        
        if (ordersResponse.success && ordersResponse.data) {
          const allOrders = Array.isArray(ordersResponse.data) 
            ? ordersResponse.data 
            : ordersResponse.data.orders || [];
          
          // Sort by createdAt and take the 5 most recent
          const sortedOrders = allOrders
            .sort((a: any, b: any) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 5);
          
          setRecentOrders(sortedOrders);

          // Calculate stats
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const todayOrders = allOrders.filter((order: any) => 
            new Date(order.createdAt) >= today
          );
          
          const activeOrders = allOrders.filter((order: any) => 
            ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)
          );
          
          const todayRevenue = todayOrders
            .filter((order: any) => order.status !== 'CANCELLED')
            .reduce((sum: number, order: any) => sum + Number(order.totalAmount), 0);
          
          const avgOrderValue = todayOrders.length > 0 
            ? todayRevenue / todayOrders.length 
            : 0;

          setStats({
            todayRevenue,
            activeOrders: activeOrders.length,
            todayOrders: todayOrders.length,
            avgOrderValue
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [restaurantId]);

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!restaurantId) return;

    const unsubscribeNewOrder = subscribe('order:new', (data) => {
      const newOrder = data.order;
      setRecentOrders(prev => [newOrder, ...prev.slice(0, 4)]);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        activeOrders: prev.activeOrders + 1,
        todayOrders: prev.todayOrders + 1,
        todayRevenue: prev.todayRevenue + Number(newOrder.totalAmount),
        avgOrderValue: (prev.todayRevenue + Number(newOrder.totalAmount)) / (prev.todayOrders + 1)
      }));
    });

    const unsubscribeStatusUpdate = subscribe('order:status', ({ orderId, status }) => {
      setRecentOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status } : order
      ));
      
      // Update active orders count
      if (['COMPLETED', 'CANCELLED'].includes(status)) {
        setStats(prev => ({
          ...prev,
          activeOrders: Math.max(0, prev.activeOrders - 1)
        }));
      }
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeStatusUpdate();
    };
  }, [restaurantId, subscribe]);

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes === 1) return '1 min ago';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 120) return '1 hour ago';
    return `${Math.floor(diffInMinutes / 60)} hours ago`;
  };

  // Map order status to display status
  const mapOrderStatus = (status: string): RecentOrderProps['status'] => {
    switch (status) {
      case 'PENDING':
      case 'CONFIRMED':
        return 'pending';
      case 'PREPARING':
        return 'preparing';
      case 'READY':
        return 'ready';
      case 'COMPLETED':
      case 'DELIVERED':
        return 'completed';
      default:
        return 'pending';
    }
  };

  const statsData = [
    {
      title: t.dashboard.todayRevenue,
      value: `€${stats.todayRevenue.toFixed(2)}`,
      icon: DollarSign,
    },
    {
      title: t.dashboard.activeOrders,
      value: stats.activeOrders.toString(),
      icon: Clock,
    },
    {
      title: t.dashboard.ordersToday,
      value: stats.todayOrders.toString(),
      icon: Users,
    },
    {
      title: t.dashboard.avgOrderValue,
      value: `€${stats.avgOrderValue.toFixed(2)}`,
      icon: TrendingUp,
    },
  ];

  // Map real orders to RecentOrderProps format
  const formattedRecentOrders: RecentOrderProps[] = recentOrders.map(order => ({
    id: order.id, // Unique key for React
    displayId: order.orderNumber?.split('-').pop() || order.id.slice(0, 4), // For display
    table: order.table?.number?.toString() || 'N/A',
    items: order.orderItems?.length || 0,
    total: `€${Number(order.totalAmount).toFixed(2)}`,
    status: mapOrderStatus(order.status),
    time: formatTimeAgo(order.createdAt)
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.title}</h1>
          <p className="text-gray-600 mt-1">
            {t.dashboard.welcomeBack}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t.dashboard.recentOrders}
            </h2>
            <button 
              onClick={() => window.location.href = '/dashboard/orders'}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {t.dashboard.viewAllOrders}
            </button>
          </div>
        </div>

        <div className="p-6">
          {formattedRecentOrders.length > 0 ? (
            <div className="space-y-1">
              {formattedRecentOrders.map((order) => (
                <RecentOrderRow key={order.id} {...order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{t.dashboard.noRecentOrders}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{t.dashboard.quickActions}</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <p className="font-medium text-gray-900">{t.dashboard.addMenuItem}</p>
              <p className="text-sm text-gray-500">{t.dashboard.createNewDish}</p>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <p className="font-medium text-gray-900">{t.dashboard.manageTables}</p>
              <p className="text-sm text-gray-500">{t.dashboard.updateTableLayout}</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t.dashboard.todayPerformance}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t.dashboard.ordersToday}</span>
              <span className="font-semibold">{stats.todayOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t.dashboard.activeOrders}</span>
              <span className="font-semibold">{stats.activeOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t.dashboard.revenueToday}</span>
              <span className="font-semibold">€{stats.todayRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{t.dashboard.systemStatus}</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">{t.dashboard.kitchenDisplay}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">{t.dashboard.paymentSystem}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">{t.dashboard.qrOrdering}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
