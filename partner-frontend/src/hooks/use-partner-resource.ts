import { useEffect, useRef, useState, useCallback } from "react";

const memoryCache = new Map<string, unknown>();

function getInitialValue<T>(key: string): T | null {
  if (memoryCache.has(key)) return memoryCache.get(key) as T;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`qp_resource_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, parsed);
      return parsed as T;
    }
  } catch {}
  return null;
}

function persistValue<T>(key: string, value: T) {
  memoryCache.set(key, value);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`qp_resource_${key}`, JSON.stringify(value));
  } catch {}
}

/**
 * High-performance SWR (Stale-While-Revalidate) loader used across partner screens.
 * Returns cached data immediately (from memory or localStorage) for 0ms lag page navigation,
 * and refreshes seamlessly in the background.
 */
export function usePartnerResource<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  cacheKey?: string,
) {
  const key = cacheKey || loader.name || loader.toString().slice(0, 40);
  const [data, setData] = useState<T | null>(() => getInitialValue<T>(key));
  const [error, setError] = useState<Error | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const isMounted = useRef(true);

  const executeLoad = useCallback(async () => {
    setIsValidating(true);
    try {
      const value = await loader();
      if (!isMounted.current) return value;
      persistValue(key, value);
      setData(value);
      setError(null);
      return value;
    } catch (err: unknown) {
      if (!isMounted.current) throw err;
      const cached = getInitialValue<T>(key);
      if (cached !== null) {
        setData(cached);
      } else {
        setError(err instanceof Error ? err : new Error("Request failed"));
      }
      throw err;
    } finally {
      if (isMounted.current) setIsValidating(false);
    }
  }, [key, loader]);

  useEffect(() => {
    isMounted.current = true;
    const initial = getInitialValue<T>(key);
    if (initial !== null) {
      setData(initial);
    }
    void executeLoad().catch(() => {});

    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  const updateData = (newData: T | ((prev: T | null) => T | null)) => {
    setData((prev) => {
      const resolved = typeof newData === "function" ? (newData as (p: T | null) => T | null)(prev) : newData;
      if (resolved !== null) {
        persistValue(key, resolved);
      }
      return resolved;
    });
  };

  return {
    data,
    error,
    isLoading: data === null && error === null,
    isValidating,
    setData: updateData,
    reload: executeLoad,
  };
}
