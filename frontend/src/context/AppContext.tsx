/**
 * Application state management with React Context
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { APTBridgeError, filterPackages, listRepositories, updatePackageLists } from "../api";
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
  updatingPackageLists: boolean;

  // Metadata
  totalPackageCount: number;
  limitedResults: boolean;
  aptListsPopulated: boolean;
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
 * Build filter params from current state.
 * searchQuery is only sent to the backend on the Search ("available") tab;
 * other tabs do their own client-side filtering.
 */
function buildFilterParams(state: AppState, overrides?: FilterParams): FilterParams {
  return {
    repository_id: overrides?.repository_id ?? state.activeRepository ?? undefined,
    tab: overrides?.tab ?? (state.activeTab !== "available" ? state.activeTab : undefined),
    search_query:
      overrides?.search_query ??
      (state.activeTab === "available" && state.searchQuery ? state.searchQuery : undefined),
    limit: overrides?.limit ?? 1000,
  };
}

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
  updatingPackageLists: false,
  totalPackageCount: 0,
  limitedResults: false,
  aptListsPopulated: true,
};

/**
 * AppContext Provider component
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  // Track the latest package load request to ignore stale responses
  const packageRequestIdRef = useRef(0);
  // Guard against concurrent auto-updates
  const aptUpdateInFlight = useRef(false);

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
      const filterParams = buildFilterParams(prev, params);

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
              aptListsPopulated: response.apt_lists_populated,
              packagesLoading: false,
            }));

            // Auto-trigger apt update if package lists are missing
            if (!response.apt_lists_populated && !aptUpdateInFlight.current) {
              aptUpdateInFlight.current = true;
              setState((current) => ({ ...current, updatingPackageLists: true }));
              updatePackageLists()
                .then(() => {
                  // Read fresh filter state via setState callback to avoid stale closure
                  setState((current) => {
                    const freshParams = buildFilterParams(current);
                    packageRequestIdRef.current++;
                    const reloadId = packageRequestIdRef.current;
                    filterPackages(freshParams)
                      .then((freshResponse) => {
                        if (reloadId === packageRequestIdRef.current) {
                          setState((c) => ({
                            ...c,
                            updatingPackageLists: false,
                            packages: freshResponse.packages,
                            totalPackageCount: freshResponse.total_count,
                            limitedResults: freshResponse.limited,
                          }));
                        }
                      })
                      .catch((e) => {
                        const msg = e instanceof APTBridgeError ? e.message : String(e);
                        setState((c) => ({
                          ...c,
                          updatingPackageLists: false,
                          error: msg,
                        }));
                      });
                    return current; // No state change from this setState
                  });
                })
                .catch((e) => {
                  // updatePackageLists itself failed
                  const msg = e instanceof APTBridgeError ? e.message : String(e);
                  setState((current) => ({
                    ...current,
                    updatingPackageLists: false,
                    error: msg,
                  }));
                })
                .finally(() => {
                  aptUpdateInFlight.current = false;
                });
            }
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
