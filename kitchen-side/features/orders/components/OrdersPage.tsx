/**
 * Orders Page Component
 * Main orders dashboard page with filtering and live updates
 */

"use client";

import { useState } from 'react';
import { useOrders } from "../hooks/useOrders";
import { useKitchenOrders } from "../hooks/useKitchenOrders";
import { OrderCard } from "./OrderCard";
import { OrderFilters } from "./OrderFilters";
import { LoadingSpinner } from "@/shared/components/ui/LoadingSpinner";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui/Button";
import { ErrorBoundary } from "@/shared/components/error";
import { useTranslation } from "@/shared/contexts/LanguageContext";
import type { OrderFilters as OrderFiltersType } from '../types';

interface OrdersPageProps {
  restaurantId: string;
}

export function OrdersPage({ restaurantId }: OrdersPageProps) {
  const t = useTranslation();
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [filters, setFilters] = useState<OrderFiltersType>({
    dateFilter: 'today'
  });

  // Use different hooks based on mode
  const ordersQuery = useOrders(restaurantId, filters);
  const kitchenQuery = useKitchenOrders(restaurantId);

  // Switch between filtered orders and live kitchen orders
  const { orders, isLoading, error, fetchOrders } = isLiveMode ? kitchenQuery : ordersQuery;

  const handleToggleLive = () => {
    setIsLiveMode(!isLiveMode);
  };

  const handleFiltersChange = (newFilters: OrderFiltersType) => {
    setFilters(newFilters);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="bg-gradient-to-br from-white/70 via-purple-50/60 to-indigo-50/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent">
              {t.orders.title}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {isLiveMode ? t.orders.liveOrders : t.orders.manageActiveOrders}
            </p>
          </div>
          
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">{t.orders.loadingOrders}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <span className="text-red-500 text-2xl mb-4 block">❌</span>
            <p className="text-red-700 mb-4">{t.orders.error}: {error}</p>
            <Button 
              onClick={fetchOrders} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t.orders.tryAgain}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-7xl mx-auto px-6 pt-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-white/70 via-purple-50/60 to-indigo-50/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent">
                {t.orders.title}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {isLiveMode ? t.orders.liveOrders : t.orders.manageActiveOrders}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={fetchOrders}
                variant="outline"
                className="text-sm"
              >
                {t.orders.refresh}
              </Button>
              <div className="text-sm text-gray-500">
                {orders.length} {t.orders.items}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <OrderFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isLive={isLiveMode}
          onToggleLive={handleToggleLive}
        />

        {/* Orders Grid */}
        {orders.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-12">
            <EmptyState
              icon="📋"
              title={isLiveMode ? t.orders.noActiveOrders : "No orders found"}
              description={
                isLiveMode 
                  ? t.orders.newOrdersWillAppear 
                  : filters.dateFilter === 'today' 
                    ? "No orders match your current filters for today."
                    : "Try adjusting your filters or date range."
              }
            />
          </div>
        ) : (
          <ErrorBoundary 
            level="section" 
            name="OrdersGrid"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
              {orders.map((order) => (
                <ErrorBoundary 
                  key={order.id}
                  level="component" 
                  name={`OrderCard-${order.orderNumber || order.id}`}
                >
                  <OrderCard
                    order={order}
                    onStatusUpdate={fetchOrders}
                    isLiveMode={isLiveMode}
                  />
                </ErrorBoundary>
              ))}
            </div>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
