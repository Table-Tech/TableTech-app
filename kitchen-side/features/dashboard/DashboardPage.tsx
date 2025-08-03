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
}: StatCardProps) => {
  // Different gradient combinations for variety
  const gradients = [
    'bg-gradient-to-br from-blue-50/80 to-indigo-100/60',
    'bg-gradient-to-br from-green-50/80 to-emerald-100/60', 
    'bg-gradient-to-br from-purple-50/80 to-violet-100/60',
    'bg-gradient-to-br from-orange-50/80 to-amber-100/60'
  ];
  
  const iconColors = [
    'text-blue-600',
    'text-green-600',
    'text-purple-600', 
    'text-orange-600'
  ];
  
  const cardIndex = Math.abs(title.length) % gradients.length;
  
  return (
    <div className={`${gradients[cardIndex]} backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-105`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-14 h-14 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-sm">
          <Icon className={`w-7 h-7 ${iconColors[cardIndex]}`} />
        </div>
        <div className="w-8 h-8 bg-white/50 rounded-lg flex items-center justify-center opacity-40 hover:opacity-70 transition-opacity cursor-pointer">
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

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
    pending: "bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200/50",
    preparing: "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200/50",
    ready: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200/50",
    completed: "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200/50",
  };

  const statusDots = {
    pending: "bg-yellow-500",
    preparing: "bg-blue-500", 
    ready: "bg-green-500",
    completed: "bg-gray-500",
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
    <div className="group flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:shadow-md hover:bg-white/70 transition-all duration-200 mb-3 hover:scale-[1.02]">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-sm font-bold text-blue-700">#{displayId}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900 flex items-center">
            <Users className="w-4 h-4 mr-2 text-blue-600" />
            {t.orders.table} {table}
          </p>
          <p className="text-sm text-gray-500 flex items-center mt-1">
            <Clock className="w-3 h-3 mr-1" />
            {items} {t.dashboard.items} • {time}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <span className="font-bold text-lg text-gray-900 bg-white/60 px-3 py-1 rounded-lg">{total}</span>
        <div className={`px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-sm ${statusColors[status]} flex items-center shadow-sm`}>
          <div className={`w-2 h-2 rounded-full ${statusDots[status]} mr-2`}></div>
          {getStatusText(status)}
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="bg-gradient-to-br from-white/70 via-blue-50/60 to-cyan-50/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm mb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent">{t.dashboard.title}</h1>
            <p className="text-gray-600 text-sm">
              {t.dashboard.welcomeBack}
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-6 pb-8 space-y-8">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm">
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              {t.dashboard.recentOrders}
            </h2>
            <button 
              onClick={() => window.location.href = '/dashboard/orders'}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              {t.dashboard.viewAllOrders}
            </button>
          </div>
        </div>

        <div className="p-6">
          {formattedRecentOrders.length > 0 ? (
            <div className="space-y-0">
              {formattedRecentOrders.map((order) => (
                <RecentOrderRow key={order.id} {...order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-500 font-medium">{t.dashboard.noRecentOrders}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-white/70 via-blue-50/40 to-indigo-50/30 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center text-lg">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            {t.dashboard.quickActions}
          </h3>
          <div className="space-y-4">
            <button 
              onClick={() => window.location.href = '/dashboard/menu'}
              className="group w-full text-left p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:bg-white/80 hover:shadow-md transition-all duration-200 transform hover:scale-105"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-green-600 text-xl">🍽️</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{t.dashboard.addMenuItem}</p>
                  <p className="text-sm text-gray-500">{t.dashboard.createNewDish}</p>
                </div>
              </div>
            </button>
            <button 
              onClick={() => window.location.href = '/dashboard/tables'}
              className="group w-full text-left p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:bg-white/80 hover:shadow-md transition-all duration-200 transform hover:scale-105"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-purple-600 text-xl">🏪</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{t.dashboard.manageTables}</p>
                  <p className="text-sm text-gray-500">{t.dashboard.updateTableLayout}</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Today's Performance */}
        <div className="bg-gradient-to-br from-white/70 via-green-50/40 to-emerald-50/30 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center text-lg">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            {t.dashboard.todayPerformance}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
              <span className="text-sm font-medium text-gray-600">{t.dashboard.ordersToday}</span>
              <span className="font-bold text-lg text-gray-900">{stats.todayOrders}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
              <span className="text-sm font-medium text-gray-600">{t.dashboard.activeOrders}</span>
              <span className="font-bold text-lg text-blue-600">{stats.activeOrders}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
              <span className="text-sm font-medium text-gray-600">{t.dashboard.revenueToday}</span>
              <span className="font-bold text-lg text-green-600">€{stats.todayRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-gradient-to-br from-white/70 via-gray-50/40 to-slate-50/30 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center text-lg">
            <div className="w-5 h-5 mr-2 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            {t.dashboard.systemStatus}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">{t.dashboard.kitchenDisplay}</span>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">{t.dashboard.paymentSystem}</span>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">{t.dashboard.qrOrdering}</span>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Ready</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
