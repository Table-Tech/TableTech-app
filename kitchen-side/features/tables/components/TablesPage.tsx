"use client";

import React, { useState, useMemo } from 'react';
import { useTables } from '../hooks/useTables';
import { Button, Input, Select, LoadingSpinner, EmptyState } from '@/shared/components/ui';
import type { TableFilters } from '../types';

interface TablesPageProps {
  restaurantId: string;
}

const TablesPage = React.memo(({ restaurantId }: TablesPageProps) => {
  const [filters, setFilters] = useState<TableFilters>({});
  const { tables, loading, error, createTable, updateTable, deleteTable } = useTables(restaurantId, filters);

  const tableStats = useMemo(() => ({
    total: tables.length,
    available: tables.filter(t => t.status === 'AVAILABLE').length,
    occupied: tables.filter(t => t.status === 'OCCUPIED').length,
    reserved: tables.filter(t => t.status === 'RESERVED').length,
    outOfOrder: tables.filter(t => t.status === 'OUT_OF_ORDER').length,
  }), [tables]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
        <Button onClick={() => {/* TODO: Open create modal */}}>
          Add Table
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold">{tableStats.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">Available</p>
          <p className="text-2xl font-bold text-green-700">{tableStats.available}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">Occupied</p>
          <p className="text-2xl font-bold text-red-700">{tableStats.occupied}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600">Reserved</p>
          <p className="text-2xl font-bold text-yellow-700">{tableStats.reserved}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Out of Order</p>
          <p className="text-2xl font-bold text-gray-700">{tableStats.outOfOrder}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search tables..."
          value={filters.search || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="max-w-xs"
        />
        <Select
          value={filters.status || ''}
          onChange={(value) => setFilters(prev => ({ 
            ...prev, 
            status: value as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_ORDER' | undefined || undefined 
          }))}
          placeholder="All Statuses"
          options={[
            { label: 'All Statuses', value: '' },
            { label: 'Available', value: 'AVAILABLE' },
            { label: 'Occupied', value: 'OCCUPIED' },
            { label: 'Reserved', value: 'RESERVED' },
            { label: 'Out of Order', value: 'OUT_OF_ORDER' },
          ]}
        />
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <EmptyState 
          title="No tables found"
          description="Create your first table to get started."
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`p-4 border rounded-lg ${
                table.status === 'AVAILABLE' ? 'border-green-200 bg-green-50' :
                table.status === 'OCCUPIED' ? 'border-red-200 bg-red-50' :
                table.status === 'RESERVED' ? 'border-yellow-200 bg-yellow-50' :
                'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold">Table {table.number}</h3>
                <p className="text-sm text-gray-600">{table.capacity} seats</p>
                <div className={`mt-2 px-2 py-1 text-xs rounded-full inline-block ${
                  table.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                  table.status === 'OCCUPIED' ? 'bg-red-100 text-red-800' :
                  table.status === 'RESERVED' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {table.status.replace('_', ' ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

TablesPage.displayName = 'TablesPage';

export default TablesPage;