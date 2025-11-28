/**
 * Application state management with React Context
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { APTBridgeError, filterPackages, listRepositories } from "../api";
import type { FilterParams, Package, Repository } from "../api/types";
import {
  loadActiveRepository,
  loadActiveTab,
  loadSearchQuery,
  saveActiveRepository,
  saveActiveTab,
  saveSearchQuery,
} from "../utils/storage";

/**
 * Application state interface
 */
export interface AppState {
  // Data
  repositories: Repository[];
  packages: Package[];

  // Filters
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
  loadRepositories: () => Promise<void>;
  loadPackages: (params?: FilterParams) => Promise<void>;

  // Filter actions
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
  repositories: [],
  packages: [],
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

  // Load repositories
  const loadRepositories = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const repositories = await listRepositories();
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

  // Refresh all data
  const refresh = useCallback(async () => {
    await loadRepositories();
    await loadPackages();
  }, [loadRepositories, loadPackages]);

  // Load initial data on mount
  useEffect(() => {
    void loadRepositories();
  }, [loadRepositories]);

  // Reload packages when filters change
  useEffect(() => {
    void loadPackages();
  }, [loadPackages, state.activeRepository, state.activeTab, state.searchQuery]);

  // Memoize actions to prevent unnecessary re-renders
  const actions: AppActions = useMemo(
    () => ({
      loadRepositories,
      loadPackages,
      setActiveRepository,
      setActiveTab,
      setSearchQuery,
      clearError,
      refresh,
    }),
    [
      loadRepositories,
      loadPackages,
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
