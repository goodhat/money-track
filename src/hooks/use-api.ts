import { useState, useEffect, useCallback } from "react";

interface UseApiOptions<T> {
  initialData?: T;
  enabled?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * A generic hook for fetching data from API endpoints
 *
 * @param url - The API endpoint URL
 * @param options - Configuration options
 * @returns Object containing data, error, loading state, and refetch function
 */
export function useApi<T>(
  url: string | null,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { initialData = null, enabled = true } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (json.error) {
        throw new Error(json.error);
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setIsLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, error, isLoading, refetch: fetchData };
}

interface UsePaginatedApiOptions<T> {
  initialData?: T[];
  enabled?: boolean;
  pageSize?: number;
}

interface PaginationInfo {
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
}

interface UsePaginatedApiResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
  error: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * A hook for fetching paginated data from API endpoints
 *
 * @param buildUrl - Function that builds the URL with optional cursor
 * @param options - Configuration options
 * @returns Object containing paginated data, loading states, and pagination controls
 */
export function usePaginatedApi<T>(
  buildUrl: (cursor?: string) => string | null,
  options: UsePaginatedApiOptions<T> = {}
): UsePaginatedApiResult<T> {
  const { initialData = [], enabled = true } = options;

  const [data, setData] = useState<T[]>(initialData);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchData = useCallback(async (cursor?: string) => {
    const url = buildUrl(cursor);
    if (!url || !enabled) return;

    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (json.error) {
        throw new Error(json.error);
      }

      if (cursor) {
        // Append to existing data
        setData((prev) => [...prev, ...json.data]);
      } else {
        // Replace data
        setData(json.data);
      }
      setPagination(json.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [buildUrl, enabled]);

  useEffect(() => {
    setData([]);
    setPagination(null);
    fetchData();
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    if (!pagination?.nextCursor || isLoadingMore) return;
    await fetchData(pagination.nextCursor);
  }, [pagination?.nextCursor, isLoadingMore, fetchData]);

  const refetch = useCallback(async () => {
    setData([]);
    setPagination(null);
    await fetchData();
  }, [fetchData]);

  return { data, pagination, error, isLoading, isLoadingMore, loadMore, refetch };
}
