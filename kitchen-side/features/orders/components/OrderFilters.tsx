/**
 * OrderFilters Component
 * Filtering controls for orders list
 */

import React from 'react';
import { Select, SelectItem } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { useTranslation } from '@/shared/contexts/LanguageContext';
import type { OrderFilters } from '../types';

interface OrderFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  isLive?: boolean;
  onToggleLive?: () => void;
}

export function OrderFilters({ filters, onFiltersChange, isLive, onToggleLive }: OrderFiltersProps) {
  const t = useTranslation();

  const handleDateFilterChange = (dateFilter: string) => {
    onFiltersChange({
      ...filters,
      dateFilter: dateFilter as 'today' | 'yesterday' | 'week' | 'month' | 'all'
    });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status || undefined
    });
  };

  const handlePaymentStatusChange = (paymentStatus: string) => {
    onFiltersChange({
      ...filters,
      paymentStatus: paymentStatus as 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' || undefined
    });
  };

  const showAllOrders = () => {
    onFiltersChange({
      dateFilter: 'all',
      status: undefined,
      paymentStatus: undefined,
      excludeStatuses: undefined
    });
  };

  const showCompletedOrders = () => {
    onFiltersChange({
      ...filters,
      status: 'COMPLETED',
      excludeStatuses: undefined
    });
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-6 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Live Toggle */}
        {onToggleLive && (
          <div className="flex items-center">
            <Button
              onClick={onToggleLive}
              variant={isLive ? "primary" : "outline"}
              className={`min-w-[100px] ${
                isLive 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'border-green-300 text-green-700 hover:bg-green-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full mr-2 ${isLive ? 'bg-green-200' : 'bg-green-500'}`}></span>
              {isLive ? t.orders.live : t.orders.offline}
            </Button>
          </div>
        )}

        {/* Date Filter */}
        <div className="min-w-[140px]">
          <Select
            value={filters.dateFilter || 'today'}
            onChange={handleDateFilterChange}
            placeholder="Date range"
          >
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="min-w-[160px]">
          <Select
            value={filters.status || ""}
            onChange={handleStatusChange}
            placeholder="Order status"
          >
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="PREPARING">Preparing</SelectItem>
            <SelectItem value="READY">Ready</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </Select>
        </div>

        {/* Payment Status Filter */}
        <div className="min-w-[140px]">
          <Select
            value={filters.paymentStatus || ""}
            onChange={handlePaymentStatusChange}
            placeholder="Payment status"
          >
            <SelectItem value="">All Payments</SelectItem>
            <SelectItem value="COMPLETED">Paid</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </Select>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex gap-2 ml-auto">
          <Button
            onClick={showCompletedOrders}
            variant="outline"
            className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            Completed
          </Button>
          <Button
            onClick={showAllOrders}
            variant="outline"
            className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            Show All
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(filters.status || filters.paymentStatus || filters.dateFilter !== 'today') && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Active filters:</span>
            {filters.dateFilter !== 'today' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                {filters.dateFilter === 'all' ? 'All time' : 
                 filters.dateFilter === 'week' ? 'This week' :
                 filters.dateFilter === 'month' ? 'This month' :
                 filters.dateFilter}
              </span>
            )}
            {filters.status && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md">
                {filters.status}
              </span>
            )}
            {filters.paymentStatus && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md">
                {filters.paymentStatus}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}