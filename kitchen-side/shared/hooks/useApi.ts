import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/shared/services/api-client';

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useApi<T = any>(url: string, options: UseApiOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (requestOptions?: RequestInit) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<T>(url, requestOptions);
      setData(response);
      
      options.onSuccess?.(response);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, [execute, options.immediate]);

  const refetch = useCallback(() => execute(), [execute]);

  return {
    data,
    loading,
    error,
    execute,
    refetch
  };
}

export function useApiMutation<TData = any, TVariables = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (
    url: string,
    variables?: TVariables,
    options?: RequestInit
  ): Promise<TData> => {
    try {
      setLoading(true);
      setError(null);

      const method = options?.method || 'POST';
      
      let response: TData;
      if (method === 'GET') {
        response = await apiClient.get<TData>(url, options);
      } else if (method === 'POST') {
        response = await apiClient.post<TData>(url, variables, options);
      } else if (method === 'PATCH') {
        response = await apiClient.patch<TData>(url, variables, options);
      } else if (method === 'PUT') {
        response = await apiClient.put<TData>(url, variables, options);
      } else if (method === 'DELETE') {
        await apiClient.delete(url, options);
        response = {} as TData;
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    mutate,
    loading,
    error
  };
}