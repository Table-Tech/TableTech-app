/**
 * KitchenDisplay Component
 * Full-screen kitchen display for order management
 */

import React from 'react';
import { KitchenOrder } from '../types';
import { OrderCard } from './OrderCard';

interface KitchenDisplayProps {
  orders: KitchenOrder[];
  onRefresh: () => void;
}

export function KitchenDisplay({ orders, onRefresh }: KitchenDisplayProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Kitchen Display</h1>
        <button
          onClick={onRefresh}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
        >
          Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-gray-800 rounded-lg p-4">
            <OrderCard order={order} onStatusUpdate={onRefresh} />
          </div>
        ))}
      </div>
    </div>
  );
}