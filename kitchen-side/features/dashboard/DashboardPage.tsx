"use client";

import React from "react";
import {
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
} from "lucide-react";

interface DashboardPageProps {
  restaurantId: string;
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease";
  icon: React.ElementType;
}

interface RecentOrderProps {
  id: string;
  table: string;
  items: number;
  total: string;
  status: "pending" | "preparing" | "ready" | "completed";
  time: string;
}

const StatCard = ({
  title,
  value,
  change,
  changeType,
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
      <div className="flex items-center space-x-1">
        {changeType === "increase" ? (
          <ArrowUpRight className="w-4 h-4 text-green-500" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-red-500" />
        )}
        <span
          className={`text-sm font-medium ${
            changeType === "increase" ? "text-green-600" : "text-red-600"
          }`}
        >
          {change}
        </span>
        <span className="text-sm text-gray-500">vs last week</span>
      </div>
    </div>
  </div>
);

const RecentOrderRow = ({
  id,
  table,
  items,
  total,
  status,
  time,
}: RecentOrderProps) => {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    preparing: "bg-blue-100 text-blue-800 border-blue-200",
    ready: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">#{id}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">Table {table}</p>
          <p className="text-sm text-gray-500">
            {items} items • {time}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <span className="font-semibold text-gray-900">{total}</span>
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusColors[status]}`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
};

export const DashboardPage = ({ restaurantId }: DashboardPageProps) => {
  // Mock data - replace with real API calls
  const stats = [
    {
      title: "Today's Revenue",
      value: "€2,847",
      change: "+12.5%",
      changeType: "increase" as const,
      icon: DollarSign,
    },
    {
      title: "Active Orders",
      value: "23",
      change: "+5.2%",
      changeType: "increase" as const,
      icon: Clock,
    },
    {
      title: "Tables Served",
      value: "67",
      change: "-2.1%",
      changeType: "decrease" as const,
      icon: Users,
    },
    {
      title: "Avg Order Value",
      value: "€42.50",
      change: "+8.3%",
      changeType: "increase" as const,
      icon: TrendingUp,
    },
  ];

  const recentOrders: RecentOrderProps[] = [
    {
      id: "128",
      table: "5",
      items: 3,
      total: "€67.50",
      status: "preparing",
      time: "2 min ago",
    },
    {
      id: "127",
      table: "12",
      items: 2,
      total: "€34.90",
      status: "ready",
      time: "5 min ago",
    },
    {
      id: "126",
      table: "8",
      items: 4,
      total: "€89.20",
      status: "completed",
      time: "8 min ago",
    },
    {
      id: "125",
      table: "3",
      items: 1,
      total: "€12.50",
      status: "pending",
      time: "10 min ago",
    },
    {
      id: "124",
      table: "15",
      items: 5,
      total: "€156.80",
      status: "preparing",
      time: "12 min ago",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Orders
            </h2>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </button>
          </div>
        </div>

        <div className="p-6">
          {recentOrders.length > 0 ? (
            <div className="space-y-1">
              {recentOrders.map((order) => (
                <RecentOrderRow key={order.id} {...order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent orders</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <p className="font-medium text-gray-900">Add Menu Item</p>
              <p className="text-sm text-gray-500">Create a new dish</p>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <p className="font-medium text-gray-900">Manage Tables</p>
              <p className="text-sm text-gray-500">Update table layout</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Today's Performance
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Orders</span>
              <span className="font-semibold">47</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Peak Hour</span>
              <span className="font-semibold">7:30 PM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Busy Tables</span>
              <span className="font-semibold">12/20</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Kitchen Display</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Payment System</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">QR Ordering</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
