import { useState, useEffect, useCallback, useMemo } from 'react';
import { tableService } from '../services/tableService';
import { useWebSocket } from '@/shared/services/websocket-client';
import { useAuth } from '@/shared/hooks/useAuth';
import type { Table, TableFilters } from '../types';

export function useTables(filters?: TableFilters) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentRestaurantId } = useAuth();
  const { subscribe, connectionStatus } = useWebSocket(currentRestaurantId || undefined);

  const fetchTables = useCallback(async () => {
    if (!currentRestaurantId) {
      setTables([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await tableService.getTables(filters);
      setTables(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  }, [currentRestaurantId, filters]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (!currentRestaurantId) return;

    const unsubscribe = subscribe('table:status', (data: { tableId: string; status: string }) => {
      console.log('Table status update received:', data);
      setTables(prev => prev.map(table => {
        if (table.id === data.tableId) {
          // Add a visual indicator that this table was updated
          return { 
            ...table, 
            status: data.status as Table['status'],
            _justUpdated: true 
          };
        }
        return table;
      }));
      
      // Remove the update indicator after a short delay
      setTimeout(() => {
        setTables(prev => prev.map(table => 
          table.id === data.tableId 
            ? { ...table, _justUpdated: false }
            : table
        ));
      }, 2000);
    });

    return unsubscribe;
  }, [currentRestaurantId, subscribe]);

  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      if (filters?.status && table.status !== filters.status) return false;
      if (filters?.capacity && table.capacity !== filters.capacity) return false;
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        return table.number.toString().includes(search);
      }
      return true;
    });
  }, [tables, filters]);

  const createTable = useCallback(async (payload: { number: number; capacity: number }) => {
    if (!currentRestaurantId) throw new Error('No restaurant selected');

    const newTable = await tableService.createTable({
      number: payload.number,
      capacity: payload.capacity,
      restaurantId: currentRestaurantId
    });
    
    setTables(prev => [...prev, newTable]);
    return newTable;
  }, [currentRestaurantId]);

  const updateTable = useCallback(async (tableId: string, payload: Partial<Table>) => {
    const updatedTable = await tableService.updateTable(tableId, payload);
    setTables(prev => prev.map(table => 
      table.id === tableId ? updatedTable : table
    ));
    return updatedTable;
  }, []);

  const deleteTable = useCallback(async (tableId: string) => {
    await tableService.deleteTable(tableId);
    setTables(prev => prev.filter(table => table.id !== tableId));
  }, []);

  return {
    tables: filteredTables,
    loading,
    error,
    connectionStatus,
    refetch: fetchTables,
    createTable,
    updateTable,
    deleteTable
  };
}