import { useState, useCallback, useEffect } from 'react';
import { api } from '@/services/api';
import { ApiResponse } from '@/types/api.types';
import { RequestConfig } from '@/types/api.types';

interface UseApiOptions extends RequestConfig {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Hook for making API requests with loading and error states
 */
export function useApi<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (fn: () => Promise<ApiResponse<T>>, options?: UseApiOptions) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fn();
        setData(response.data);
        options?.onSuccess?.(response.data);
        return response.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        options?.onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const get = useCallback(
    async (endpoint: string, options?: UseApiOptions) => {
      return execute(() => api.get<T>(endpoint, options), options);
    },
    [execute]
  );

  const post = useCallback(
    async (endpoint: string, data?: any, options?: UseApiOptions) => {
      return execute(() => api.post<T>(endpoint, data, options), options);
    },
    [execute]
  );

  const put = useCallback(
    async (endpoint: string, data?: any, options?: UseApiOptions) => {
      return execute(() => api.put<T>(endpoint, data, options), options);
    },
    [execute]
  );

  const patch = useCallback(
    async (endpoint: string, data?: any, options?: UseApiOptions) => {
      return execute(() => api.patch<T>(endpoint, data, options), options);
    },
    [execute]
  );

  const delete_ = useCallback(
    async (endpoint: string, options?: UseApiOptions) => {
      return execute(() => api.delete<T>(endpoint, options), options);
    },
    [execute]
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    get,
    post,
    put,
    patch,
    delete: delete_,
    reset,
  };
}

/**
 * Hook for fetching data on mount
 */
export function useFetch<T = any>(endpoint: string, options?: UseApiOptions) {
  const { data, loading, error, get } = useApi<T>();

  // Fetch on mount
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      get(endpoint, options);
    }
  }, [endpoint, mounted, get, options]);

  return { data, loading, error };
}
