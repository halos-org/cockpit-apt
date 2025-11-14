/**
 * Type definitions for cockpit-apt.
 *
 * Defines all interfaces and types used throughout the application.
 */

// ==================== Package Types ====================

/**
 * Basic package information (from backend list views)
 * Returned by: search, list-section, list-installed, list-upgradable
 * Backend: backend/cockpit_apt_bridge/utils/formatters.py:format_package()
 */
export interface Package {
  name: string;
  summary: string;
  version: string;
  installed: boolean;
  section: string;
}

/**
 * Detailed package information with all metadata
 * Returned by: details command
 * Backend: backend/cockpit_apt_bridge/utils/formatters.py:format_package_details()
 */
export interface PackageDetails {
  name: string;
  summary: string;
  description: string;
  section: string;
  installed: boolean;
  installedVersion: string | null;
  candidateVersion: string | null;
  priority: string;
  homepage: string;
  maintainer: string;
  size: number;
  installedSize: number;
  dependencies: Dependency[];
  reverseDependencies: string[];

  // AppStream metadata (optional - Phase 1.5)
  appstreamId?: string | null;
  icon?: string | null;
  screenshots?: Screenshot[] | null;
  categories?: string[] | null;
  keywords?: string[] | null;
  developerName?: string | null;
  projectLicense?: string | null;
  contentRating?: ContentRating | null;
  releases?: Release[] | null;
}

/**
 * Package dependency information
 * Backend: backend/cockpit_apt_bridge/utils/formatters.py:format_dependency()
 */
export interface Dependency {
  name: string;
  relation: string; // >=, <=, =, <<, >>, or empty string
  version: string; // version constraint or empty string
}

/** Package with upgrade information */
export interface UpgradablePackage {
  name: string;
  installedVersion: string;
  candidateVersion: string;
  summary: string;
}

// ==================== Section Types ====================

/**
 * Debian section information
 * Returned by: sections command
 * Backend: backend/cockpit_apt_bridge/commands/sections.py
 */
export interface Section {
  name: string;
  count: number;
  // UI-only fields (added by frontend)
  label?: string;
  description?: string;
  icon?: string;
  installedCount?: number;
}

// ==================== AppStream Types (Phase 1.5) ====================

export interface Screenshot {
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface ContentRating {
  type: string; // e.g., "oars-1.1"
  ratings: Record<string, string>;
}

export interface Release {
  version: string;
  date?: string;
  description?: string;
  urgency?: string;
}

// ==================== Operation Types ====================

/**
 * Progress information for package operations
 * Matches: frontend/src/lib/progress-reporter.ts:ProgressInfo
 */
export interface OperationProgress {
  package?: string;
  percentage: number;
  message: string;
  stage?: string;
  complete: boolean;
  cancelled: boolean;
  error?: string;
}

/** Callback for operation progress updates */
export type ProgressCallback = (progress: OperationProgress) => void;

// ==================== Error Types ====================
// Error handling is defined in error-handler.ts
// Use: import { APTError, translateError, isErrorCode, getUserMessage } from './error-handler';

// ==================== Configuration Types ====================

/** View configuration from JSON */
export interface ViewConfiguration {
  id: string;
  name: string;
  enabled: boolean;
  type: "section-filter" | "custom-query" | "predefined-list";
  filter: FilterCriteria;
  sort?: SortCriteria;
  ui?: UICustomization;
}

/** Filter criteria for custom views */
export interface FilterCriteria {
  sections?: string[];
  sectionsExclude?: string[];
  namePattern?: string;
  installed?: boolean;
  priority?: string[];
  categories?: string[]; // AppStream categories (Phase 1.5)
}

/** Sort criteria */
export interface SortCriteria {
  field: "name" | "section" | "size" | "installedSize";
  order: "asc" | "desc";
}

/** UI customization options */
export interface UICustomization {
  showIcons?: boolean; // AppStream icons (Phase 1.5)
  showScreenshots?: boolean; // AppStream screenshots (Phase 1.5)
  showMetadata?: boolean;
  cardLayout?: boolean;
  featuredPackages?: string[];
  icon?: string | null;
}

/** Root configuration object */
export interface Configuration {
  version: string;
  views: ViewConfiguration[];
}

// ==================== Cockpit Types ====================

/** Cockpit API declarations */
declare global {
  const cockpit: {
    spawn(args: string[], options?: SpawnOptions): Spawn;
    file(path: string): File;
    location: Location;
    addEventListener(event: "locationchanged" | "visibilitychange", callback: () => void): void;
    removeEventListener(event: "locationchanged" | "visibilitychange", callback: () => void): void;
  };

  interface Window {
    debugging?: string | string[];
  }

  interface ErrorConstructor {
    // eslint-disable-next-line @typescript-eslint/ban-types
    captureStackTrace?(targetObject: object, constructorOpt?: Function): void;
  }

  interface SpawnOptions {
    err?: "message" | "ignore" | "out";
    superuser?: "require" | "try";
    environ?: string[];
  }

  interface Spawn {
    stream(callback: (data: string) => void): Spawn;
    done(callback: (data: string | null) => void): Spawn;
    fail(callback: (error: unknown, data: string | null) => void): Spawn;
    close(callback: (status: number, data: string | null) => void): Spawn;
  }

  interface File {
    read(): Promise<string>;
    replace(content: string): Promise<void>;
    watch(callback: (content: string) => void): void;
  }

  interface Location {
    path: string[];
    options: Record<string, string | string[]>;
    go(path: string | string[], options?: Record<string, string>): void;
  }
}
