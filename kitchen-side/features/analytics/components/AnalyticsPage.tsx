"use client";

import React, { useState, useMemo } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { LoadingSpinner, EmptyState, Select } from '@/shared/components/ui';
import type { AnalyticsFilters } from '../types';

const AnalyticsPage = React.memo(() => {
  const [filters, setFilters] = useState<AnalyticsFilters>({ period: 'week' });
  const { data, loading, error } = useAnalytics(filters);

  const formatCurrency = useMemo(() => (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount)
  , []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="No data available" description="Analytics data will appear here once you have orders." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <Select
          value={filters.period || 'week'}
          onChange={(value) => setFilters(prev => ({ ...prev, period: value as any }))}
          options={[
            { label: 'Today', value: 'day' },
            { label: 'This Week', value: 'week' },
            { label: 'This Month', value: 'month' },
            { label: 'This Year', value: 'year' },
          ]}
        />
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Today's Revenue</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data.revenue.today)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">This Week</h3>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.revenue.week)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">This Month</h3>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(data.revenue.month)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">This Year</h3>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.revenue.year)}</p>
        </div>
      </div>

      {/* Orders Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Orders Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Today's Orders</span>
              <span className="font-semibold">{data.orders.today}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">This Week</span>
              <span className="font-semibold">{data.orders.week}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">This Month</span>
              <span className="font-semibold">{data.orders.month}</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-green-600">
                <span>Completed</span>
                <span className="font-semibold">{data.orders.completed}</span>
              </div>
              <div className="flex justify-between text-yellow-600">
                <span>Pending</span>
                <span className="font-semibold">{data.orders.pending}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Cancelled</span>
                <span className="font-semibold">{data.orders.cancelled}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Table Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Tables</span>
              <span className="font-semibold">{data.tables.total}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Occupied</span>
              <span className="font-semibold">{data.tables.occupied}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Available</span>
              <span className="font-semibold">{data.tables.available}</span>
            </div>
            <div className="flex justify-between text-yellow-600">
              <span>Reserved</span>
              <span className="font-semibold">{data.tables.reserved}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Items */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Popular Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.popularItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(item.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

AnalyticsPage.displayName = 'AnalyticsPage';

export default AnalyticsPage;