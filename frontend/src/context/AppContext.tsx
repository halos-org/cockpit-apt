/**
 * Application state management with React Context
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { APTBridgeError, filterPackages, listRepositories, listStores } from "../api";
import type { FilterParams, Package, Repository, Store } from "../api/types";
import {
  loadActiveRepository,
  loadActiveStore,
  loadActiveTab,
  loadSearchQuery,
  saveActiveRepository,
  saveActiveStore,
  saveActiveTab,
  saveSearchQuery,
} from "../utils/storage";

/**
 * Application state interface
 */
export interface AppState {
  // Data
  stores: Store[];
  repositories: Repository[];
  packages: Package[];

  // Filters
  activeStore: string | null;
  activeRepository: string | null;
  activeTab: "installed" | "upgradable" | "available";
  searchQuery: string;

  // UI state
  loading: boolean;
  error: string | null;
  packagesLoading: boolean;
  packagesError: string | null;

  // Metadata
  totalPackageCount: number;
  limitedResults: boolean;
}

/**
 * Application actions interface
 */
export interface AppActions {
  // Data loading
  loadStores: () => Promise<void>;
  loadRepositories: (storeId?: string) => Promise<void>;
  loadPackages: (params?: FilterParams) => Promise<void>;

  // Filter actions
  setActiveStore: (storeId: string | null) => void;
  setActiveRepository: (repoId: string | null) => void;
  setActiveTab: (tab: "installed" | "upgradable" | "available") => void;
  setSearchQuery: (query: string) => void;

  // Utility actions
  clearError: () => void;
  refresh: () => Promise<void>;
}

/**
 * Combined context type
 */
export interface AppContextType {
  state: AppState;
  actions: AppActions;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Initial state
 */
const initialState: AppState = {
  stores: [],
  repositories: [],
  packages: [],
  activeStore: loadActiveStore(),
  activeRepository: loadActiveRepository(),
  activeTab: loadActiveTab() || "available",
  searchQuery: loadSearchQuery(),
  loading: false,
  error: null,
  packagesLoading: false,
  packagesError: null,
  totalPackageCount: 0,
  limitedResults: false,
};

/**
 * AppContext Provider component
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  // Track the latest package load request to ignore stale responses
  const packageRequestIdRef = React.useRef(0);

  // Load stores on mount
  const loadStores = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const stores = await listStores();
      setState((prev) => ({ ...prev, stores, loading: false }));
    } catch (e) {
      const error = e instanceof APTBridgeError ? e.message : String(e);
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  // Load repositories
  const loadRepositories = useCallback(async (storeId?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const repositories = await listRepositories(storeId);
      setState((prev) => ({ ...prev, repositories, loading: false }));
    } catch (e) {
      const error = e instanceof APTBridgeError ? e.message : String(e);
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  // Load packages - reads from current state, no dependencies on state values
  const loadPackages = useCallback(async (params?: FilterParams) => {
    // Increment request ID to track this request
    const requestId = ++packageRequestIdRef.current;

    setState((prev) => {
      const filterParams: FilterParams = {
        store_id: params?.store_id ?? prev.activeStore ?? undefined,
        repository_id: params?.repository_id ?? prev.activeRepository ?? undefined,
        tab: params?.tab ?? (prev.activeTab !== "available" ? prev.activeTab : undefined),
        search_query: params?.search_query ?? (prev.searchQuery || undefined),
        limit: params?.limit ?? 1000,
      };

      // Start loading
      filterPackages(filterParams)
        .then((response) => {
          // Only apply results if this is still the latest request
          if (requestId === packageRequestIdRef.current) {
            setState((current) => ({
              ...current,
              packages: response.packages,
              totalPackageCount: response.total_count,
              limitedResults: response.limited,
              packagesLoading: false,
            }));
          }
        })
        .catch((e) => {
          // Only apply error if this is still the latest request
          if (requestId === packageRequestIdRef.current) {
            const error = e instanceof APTBridgeError ? e.message : String(e);
            setState((current) => ({ ...current, packagesError: error, packagesLoading: false }));
          }
        });

      return { ...prev, packages: [], packagesLoading: true, packagesError: null };
    });
  }, []);

  // Set active store
  const setActiveStore = useCallback((storeId: string | null) => {
    setState((prev) => ({ ...prev, activeStore: storeId, activeRepository: null }));
    saveActiveStore(storeId);
    saveActiveRepository(null);
  }, []);

  // Set active repository
  const setActiveRepository = useCallback((repoId: string | null) => {
    setState((prev) => ({ ...prev, activeRepository: repoId }));
    saveActiveRepository(repoId);
  }, []);

  // Set active tab
  const setActiveTab = useCallback((tab: "installed" | "upgradable" | "available") => {
    setState((prev) => ({ ...prev, activeTab: tab }));
    saveActiveTab(tab);
  }, []);

  // Set search query
  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
    saveSearchQuery(query);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, packagesError: null }));
  }, []);

  // Refresh all data - reads current activeStore from state
  const refresh = useCallback(async () => {
    await loadStores();
    setState((prev) => {
      void loadRepositories(prev.activeStore ?? undefined);
      return prev;
    });
    await loadPackages();
  }, [loadStores, loadRepositories, loadPackages]);

  // Load initial data on mount
  useEffect(() => {
    void loadStores();
    void loadRepositories(state.activeStore ?? undefined);
  }, [loadStores, loadRepositories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload repositories when active store changes
  useEffect(() => {
    void loadRepositories(state.activeStore ?? undefined);
  }, [state.activeStore, loadRepositories]);

  // Reload packages when filters change
  useEffect(() => {
    void loadPackages();
  }, [loadPackages, state.activeStore, state.activeRepository, state.activeTab, state.searchQuery]);

  // Memoize actions to prevent unnecessary re-renders
  const actions: AppActions = useMemo(
    () => ({
      loadStores,
      loadRepositories,
      loadPackages,
      setActiveStore,
      setActiveRepository,
      setActiveTab,
      setSearchQuery,
      clearError,
      refresh,
    }),
    [
      loadStores,
      loadRepositories,
      loadPackages,
      setActiveStore,
      setActiveRepository,
      setActiveTab,
      setSearchQuery,
      clearError,
      refresh,
    ]
  );

  return <AppContext.Provider value={{ state, actions }}>{children}</AppContext.Provider>;
}

/**
 * Hook to use app context
 */
export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
