import { useState, useEffect, useCallback, useMemo } from 'react';
import { tableService } from '../services/tableService';
import { useWebSocket } from '@/shared/services/websocket-client';
import type { Table, TableFilters } from '../types';

export function useTables(restaurantId: string, filters?: TableFilters) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useWebSocket(restaurantId);

  const fetchTables = useCallback(async () => {
    if (!restaurantId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await tableService.getTables(restaurantId, filters);
      setTables(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, filters]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (!restaurantId) return;

    const unsubscribe = subscribe('tableStatusUpdate', (data: { tableId: string; status: string }) => {
      setTables(prev => prev.map(table => 
        table.id === data.tableId 
          ? { ...table, status: data.status as Table['status'] }
          : table
      ));
    });

    return unsubscribe;
  }, [restaurantId, subscribe]);

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
    if (!restaurantId) throw new Error('No restaurant selected');

    const newTable = await tableService.createTable({
      ...payload,
      restaurantId: restaurantId
    });
    
    setTables(prev => [...prev, newTable]);
    return newTable;
  }, [restaurantId]);

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