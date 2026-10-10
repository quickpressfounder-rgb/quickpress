/**
 * useHomeData — Home Screen state management.
 *
 * Owns the full Home load lifecycle: initial load, per-section loading and
 * error state, pull-to-refresh, network awareness and auto-retry when the
 * device comes back online. The screen stays presentational.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { isOnline, onNetworkChange } from "@/api/customer/api/network";
import {
  emptySections,
  initialSections,
  invalidateHomeCache,
  loadHome,
  type HomeSections,
  type SectionKey,
} from "@/api/customer/services/home-service";
import { changeLocation, refreshLocationFromGps, readLocation, getDefaultLocation } from "@/api/customer/services/location-service";
import { greetingFor } from "@/api/customer/services/profile-service";
import type { SavedLocation } from "@/api/customer/location";

export type UseHomeData = {
  sections: HomeSections;
  greeting: string;
  /** True until the very first load settles. */
  initialLoading: boolean;
  refreshing: boolean;
  online: boolean;
  /** True when every section failed — the screen shows a full error state. */
  failed: boolean;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  useCurrentLocation: () => Promise<void>;
  setLocation: (location: SavedLocation) => void;
};

export function useHomeData(): UseHomeData {
  // Use emptySections on SSR/initial hydration so server and client DOM are 100% identical
  const [sections, setSections] = useState<HomeSections>(() => emptySections());
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const autoDetectTriggered = useRef(false);

  useEffect(() => {
    // Populate cache on client immediately after hydration completes (avoids React #418 error)
    const cached = initialSections();
    const hasCachedData = Boolean(
      cached.categories?.data?.length ||
      cached.banners?.data?.length ||
      cached.partners?.data?.length
    );
    setSections(cached);
    if (hasCachedData) {
      setInitialLoading(false);
    }
  }, []);

  const applySection = useCallback(
    <K extends SectionKey>(key: K, state: HomeSections[K]) => {
      setSections((prev) => ({ ...prev, [key]: state }));
    },
    [],
  );

  const load = useCallback(
    async (options: { forceRefresh?: boolean } = {}) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (options.forceRefresh) setSections(initialSections());

      try {
        await loadHome({
          forceRefresh: options.forceRefresh ?? false,
          signal: controller.signal,
          onSection: applySection,
        });
      } finally {
        if (!controller.signal.aborted) setInitialLoading(false);
      }
    },
    [applySection],
  );

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    invalidateHomeCache();
    try {
      await load({ forceRefresh: true });
    } finally {
      setRefreshing(false);
    }
  }, [load, refreshing]);

  const retry = useCallback(async () => {
    setInitialLoading(true);
    await load({ forceRefresh: true });
  }, [load]);

  const useCurrentLocation = useCallback(async () => {
    applySection("location", { data: sections.location.data || getDefaultLocation(), loading: true, error: null });
    try {
      const location = await refreshLocationFromGps({ allowFallback: true });
      applySection("location", { data: location, loading: false, error: null });
      await load({ forceRefresh: true });
    } catch {
      const fallback = sections.location.data || getDefaultLocation();
      changeLocation(fallback);
      applySection("location", {
        data: fallback,
        loading: false,
        error: null,
      });
      void load({ forceRefresh: true });
    }
  }, [applySection, load, sections.location.data]);

  const setLocation = useCallback(
    (location: SavedLocation) => {
      changeLocation(location);
      applySection("location", { data: location, loading: false, error: null });
      void load({ forceRefresh: true });
    },
    [applySection, load],
  );

  useEffect(() => {
    setOnline(isOnline());
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  // Network awareness: auto-retry once connectivity returns.
  useEffect(() => {
    return onNetworkChange((next) => {
      setOnline(next);
      if (next) void load({ forceRefresh: true });
    });
  }, [load]);

  // Auto-detect real live device GPS location on start if no location saved yet
  useEffect(() => {
    if (autoDetectTriggered.current) return;
    const saved = readLocation();
    if (!saved) {
      autoDetectTriggered.current = true;
      void useCurrentLocation();
    }
  }, [useCurrentLocation]);

  const settled = Object.values(sections).filter((section) => !section.loading);
  const failed =
    settled.length > 0 && settled.every((section) => section.error !== null && section.data === null);

  return {
    sections,
    greeting: greetingFor(),
    initialLoading,
    refreshing,
    online,
    failed,
    refresh,
    retry,
    useCurrentLocation,
    setLocation,
  };
}
