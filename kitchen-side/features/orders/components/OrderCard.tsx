/**
 * OrderCard Component
 * Individual order card display with status management
 */

import React from 'react';
import { KitchenOrder } from '../types';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { Button } from '@/shared/components/ui/Button';

interface OrderCardProps {
  order: KitchenOrder;
  onStatusUpdate?: () => void;
  isLiveMode?: boolean;
}

export function OrderCard({ order, onStatusUpdate }: OrderCardProps) {
  const { updateStatus, getStatusColor, getNextStatus, isUpdating } = useOrderStatus();

  const handleStatusUpdate = async () => {
    const nextStatus = getNextStatus(order.status);
    if (!nextStatus) return;

    const result = await updateStatus(order.id, nextStatus);
    if (result.success) {
      onStatusUpdate?.();
    }
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <div className="bg-white p-5 rounded-xl shadow-md border border-slate-100">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0a3c6e]">
            Tafel {order.table.number}
          </h2>
          <p className="text-sm text-slate-500">Order #{order.orderNumber}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </div>
      
      <p className="text-sm text-slate-600 mb-3">
        Aantal items: {order.orderItems.length}
      </p>
      
      <div className="space-y-1 mb-4">
        {order.orderItems.map((item) => (
          <div key={item.id} className="text-sm text-slate-600">
            <span className="font-medium">{item.quantity}x</span> {item.menuItem.name}
            {item.notes && (
              <p className="text-xs text-gray-500 ml-4">Note: {item.notes}</p>
            )}
            {item.modifiers.length > 0 && (
              <div className="text-xs text-gray-500 ml-4">
                {item.modifiers.map((mod, index) => (
                  <span key={index}>+ {mod.modifier.name}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {nextStatus && (
        <Button
          onClick={handleStatusUpdate}
          isLoading={isUpdating}
          variant="primary"
          size="sm"
          className="w-full"
        >
          Mark as {nextStatus}
        </Button>
      )}
    </div>
  );
}