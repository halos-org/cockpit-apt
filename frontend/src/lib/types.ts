/**
 * Type definitions for cockpit-apt.
 *
 * Defines all interfaces and types used throughout the application.
 */

// ==================== Package Types ====================

/** Basic package information */
export interface Package {
  name: string;
  version: string;
  architecture?: string;
  summary: string;
  installed: boolean;
}

/** Detailed package information with all metadata */
export interface PackageDetails extends Package {
  description: string;
  section: string;
  priority?: string;
  homepage?: string;
  maintainer?: string;
  size?: number;
  installedSize?: number;
  dependencies?: Dependency[];
  reverseDependencies?: string[];
  installedVersion?: string | null;
  candidateVersion?: string | null;

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

/** Package dependency information */
export interface Dependency {
  name: string;
  relation?: string; // <, <=, =, >=, >
  version?: string;
}

/** Package with upgrade information */
export interface UpgradablePackage {
  name: string;
  installedVersion: string;
  candidateVersion: string;
  summary: string;
}

// ==================== Section Types ====================

/** Debian section information */
export interface Section {
  name: string;
  label: string;
  description?: string;
  icon?: string;
  count: number;
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

/** Progress information for package operations */
export interface OperationProgress {
  type: "status" | "download";
  package: string | null;
  percentage: number;
  message: string;
}

/** Callback for operation progress updates */
export type ProgressCallback = (progress: OperationProgress) => void;

// ==================== Error Types ====================

/** Custom error for APT operations */
export class APTError extends Error {
  code: string;
  details: string | null;

  constructor(message: string, code: string, details: string | null = null) {
    super(message);
    this.name = "APTError";
    this.code = code;
    this.details = details;
  }
}

/** Error codes */
export const ErrorCodes = {
  PACKAGE_NOT_FOUND: "PACKAGE_NOT_FOUND",
  EXEC_ERROR: "EXEC_ERROR",
  PARSE_ERROR: "PARSE_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  LOCKED: "LOCKED",
  LOCK_TIMEOUT: "LOCK_TIMEOUT",
  NETWORK_ERROR: "NETWORK_ERROR",
  DISK_FULL: "DISK_FULL",
  UNKNOWN: "UNKNOWN",
} as const;

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
  };

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
    options: Record<string, string>;
    go(path: string | string[], options?: Record<string, string>): void;
  }
}
