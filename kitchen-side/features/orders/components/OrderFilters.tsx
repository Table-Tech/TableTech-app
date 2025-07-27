/**
 * OrderFilters Component
 * Filtering controls for orders list
 */

import React from 'react';
import { Select, SelectItem } from '@/shared/components/ui/Select';
import type { OrderFilters } from '../types';

interface OrderFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
}

export function OrderFilters({ filters, onFiltersChange }: OrderFiltersProps) {
  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status || undefined
    });
  };

  return (
    <div className="flex gap-4 mb-6">
      <div className="min-w-[200px]">
        <Select
          value={filters.status || ""}
          onChange={handleStatusChange}
          placeholder="Filter by status"
        >
          <SelectItem value="">All Orders</SelectItem>
          <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          <SelectItem value="PREPARING">Preparing</SelectItem>
          <SelectItem value="READY">Ready</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
        </Select>
      </div>
      
      {/* Add more filters as needed */}
    </div>
  );
}