/**
 * OrderStatus Component
 * Status badge component for orders
 */

import React from 'react';
import { useOrderStatus } from '../hooks/useOrderStatus';

interface OrderStatusProps {
  status: string;
  className?: string;
}

export function OrderStatus({ status, className = "" }: OrderStatusProps) {
  const { getStatusColor } = useOrderStatus();

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)} ${className}`}>
      {status}
    </span>
  );
}