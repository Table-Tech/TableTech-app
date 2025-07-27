import { useState, useEffect, useCallback, useMemo } from 'react';
import { tableService } from '../services/tableService';
import { useAuth } from '@/shared/hooks/useAuth';
import { useWebSocket } from '@/shared/services/websocket-client';
import type { Table, TableFilters } from '../types';

export function useTables(filters?: TableFilters) {
  const { restaurant } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useWebSocket(restaurant?.id);

  const fetchTables = useCallback(async () => {
    if (!restaurant?.id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await tableService.getTables(restaurant.id, filters);
      setTables(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id, filters]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (!restaurant?.id) return;

    const unsubscribe = subscribe('tableStatusUpdate', (data: { tableId: string; status: string }) => {
      setTables(prev => prev.map(table => 
        table.id === data.tableId 
          ? { ...table, status: data.status as Table['status'] }
          : table
      ));
    });

    return unsubscribe;
  }, [restaurant?.id, subscribe]);

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

  const createTable = useCallback(async (payload: Omit<Table, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    if (!restaurant?.id) throw new Error('No restaurant selected');

    const newTable = await tableService.createTable({
      ...payload,
      restaurantId: restaurant.id
    });
    
    setTables(prev => [...prev, newTable]);
    return newTable;
  }, [restaurant?.id]);

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
    refetch: fetchTables,
    createTable,
    updateTable,
    deleteTable
  };
}