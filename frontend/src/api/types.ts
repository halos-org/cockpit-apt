/**
 * TypeScript interfaces for backend API data structures
 */

/**
 * Custom section metadata for a store
 */
export interface CustomSection {
  section: string;
  label: string;
  description: string;
  icon?: string;
}

/**
 * Store configuration from stores.yaml
 */
export interface Store {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  repositories?: string[];
  debtags?: string[];
  custom_sections?: CustomSection[];
}

/**
 * Repository information with package count
 */
export interface Repository {
  id: string;
  name: string;
  origin: string;
  label: string;
  suite: string;
  package_count: number;
}

/**
 * Package summary information
 */
export interface Package {
  name: string;
  version: string;
  summary: string;
  section: string;
  installed: boolean;
  upgradable: boolean;
  repository_id?: string;
  debtags?: string[];
  // Additional fields for upgradable packages
  installedVersion?: string;
  candidateVersion?: string;
}

/**
 * Filter parameters for package filtering
 */
export interface FilterParams {
  store_id?: string;
  repository_id?: string;
  tab?: "installed" | "upgradable";
  search_query?: string;
  limit?: number;
}

/**
 * Package filter response from backend
 */
export interface FilterPackagesResponse {
  packages: Package[];
  total_count: number;
  applied_filters: string[];
  limit: number;
  limited: boolean;
}

/**
 * Error response from backend
 */
export interface APIError {
  error: string;
  details?: string;
  code?: string;
}
