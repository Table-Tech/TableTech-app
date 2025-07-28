/**
 * Orders Page Component
 * Main kitchen orders dashboard page
 */

"use client";

import { useKitchenOrders } from "../hooks/useKitchenOrders";
import { OrderCard } from "./OrderCard";
import { LoadingSpinner } from "@/shared/components/ui/LoadingSpinner";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui/Button";
import { ErrorBoundary } from "@/shared/components/error";

interface OrdersPageProps {
  restaurantId: string;
}

export function OrdersPage({ restaurantId }: OrdersPageProps) {
  const { orders, isLoading, error, fetchOrders } =
    useKitchenOrders(restaurantId);

  if (isLoading) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <Button onClick={fetchOrders} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <h1 className="text-2xl font-bold text-[#0a3c6e] mb-6">Live Orders</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No orders at the moment"
          description="Orders will appear here when customers place them."
        />
      ) : (
        <ErrorBoundary 
          level="section" 
          name="OrdersGrid"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <ErrorBoundary 
                key={order.id}
                level="component" 
                name={`OrderCard-${order.orderNumber || order.id}`}
              >
                <OrderCard
                  order={order}
                  onStatusUpdate={fetchOrders}
                />
              </ErrorBoundary>
            ))}
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
