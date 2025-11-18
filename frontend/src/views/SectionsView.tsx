/**
 * SectionsView Component
 *
 * Displays Debian sections as a grid of cards.
 * Each card shows section name, package count, and icon.
 *
 * Features:
 * - Grid layout responsive to screen size
 * - Click on card navigates to section package list
 * - Loading skeleton during initial load
 * - Error handling with retry
 * - Empty state if no sections found
 *
 * Usage:
 *   <SectionsView onNavigateToSection={(name) => navigateTo(`/sections/${name}`)} />
 */

import { Badge, EmptyState, EmptyStateBody, Grid, GridItem, Title } from "@patternfly/react-core";
import {
  BookIcon,
  ChartAreaIcon,
  ChartLineIcon,
  CodeIcon,
  CogIcon,
  ConnectedIcon,
  CubesIcon,
  DatabaseIcon,
  DesktopIcon,
  EditIcon,
  EnvelopeIcon,
  FolderIcon,
  GlobeIcon,
  ImageIcon,
  LayerGroupIcon,
  MapIcon,
  MapMarkerIcon,
  NetworkWiredIcon,
  ServerIcon,
  TerminalIcon,
  VolumeUpIcon,
} from "@patternfly/react-icons";
import React, { useMemo } from "react";
import type { Category, CustomSection, Store } from "../api/types";
import { CategoryCard } from "../components/CategoryCard";
import { ErrorAlert } from "../components/ErrorAlert";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { SectionCard } from "../components/SectionCard";
import { useApp } from "../context/AppContext";
import { useCategories, useSections } from "../hooks/usePackages";

export interface SectionsViewProps {
  /** Callback when user clicks on a section to view packages */
  onNavigateToSection?: (sectionName: string) => void;
}

/**
 * Debian archive area prefixes
 * Sections can be prefixed with archive area (e.g., "contrib/net", "non-free/games")
 * Main archive sections have no prefix
 */
const ARCHIVE_PREFIXES = ["contrib/", "non-free/", "non-free-firmware/"] as const;

/**
 * Archive area priority for sorting
 * Lower numbers appear first
 */
const ARCHIVE_PRIORITY: Record<string, number> = {
  main: 0, // No prefix = main archive
  contrib: 1,
  "non-free": 2,
  "non-free-firmware": 3,
};

/**
 * Parse a section name into prefix and base section
 * Examples:
 *   "web" → { prefix: null, baseSection: "web", area: "main" }
 *   "contrib/net" → { prefix: "contrib", baseSection: "net", area: "contrib" }
 */
function parseSectionName(sectionName: string): {
  prefix: string | null;
  baseSection: string;
  area: string;
} {
  for (const prefix of ARCHIVE_PREFIXES) {
    if (sectionName.startsWith(prefix)) {
      const baseSection = sectionName.substring(prefix.length);
      const area = prefix.slice(0, -1); // Remove trailing slash
      return { prefix: area, baseSection, area };
    }
  }
  return { prefix: null, baseSection: sectionName, area: "main" };
}

/**
 * Mapping from Debian section names to PatternFly icons
 * Based on common section names from Debian package repository
 */
const SECTION_ICON_MAP: Record<string, React.ComponentType> = {
  // Development
  devel: CodeIcon,
  libdevel: CodeIcon,
  vcs: CodeIcon,

  // Programming languages
  python: CodeIcon,
  perl: CodeIcon,
  ruby: CodeIcon,
  php: CodeIcon,
  java: CodeIcon,
  javascript: CodeIcon,
  lisp: CodeIcon,
  ocaml: CodeIcon,
  rust: CodeIcon,
  golang: CodeIcon,
  haskell: CodeIcon,

  // Web and Network
  web: GlobeIcon,
  net: NetworkWiredIcon,
  comm: NetworkWiredIcon,
  httpd: ServerIcon,
  news: NetworkWiredIcon,
  mail: EnvelopeIcon,

  // Multimedia
  sound: VolumeUpIcon,
  video: VolumeUpIcon,
  graphics: ImageIcon,

  // Games
  games: CubesIcon,

  // Documentation
  doc: BookIcon,
  text: BookIcon,

  // System
  admin: CogIcon,
  shells: TerminalIcon,
  utils: CogIcon,
  editors: EditIcon,
  kernel: ServerIcon,

  // Desktop
  gnome: DesktopIcon,
  kde: DesktopIcon,
  xfce: DesktopIcon,
  x11: DesktopIcon,

  // Data
  database: DatabaseIcon,
  dbs: DatabaseIcon,

  // Libraries and packages
  libs: LayerGroupIcon,
  metapackages: LayerGroupIcon,
};

/**
 * Mapping from category IDs to PatternFly icons
 * Used for marine and other custom store categories
 */
const CATEGORY_ICON_MAP: Record<string, React.ComponentType> = {
  // Marine categories
  navigation: MapIcon,
  chartplotters: MapMarkerIcon,
  monitoring: ChartLineIcon,
  communication: ConnectedIcon,
  visualization: ChartAreaIcon,

  // Common categories that might be used by other stores
  development: CodeIcon,
  database: DatabaseIcon,
  web: GlobeIcon,
  network: NetworkWiredIcon,
  system: CogIcon,
  multimedia: VolumeUpIcon,
  graphics: ImageIcon,
};

/**
 * Get an appropriate icon for a section based on its base name (without prefix)
 * Falls back to FolderIcon for unmapped sections
 */
function getSectionIcon(sectionName: string): React.ReactNode {
  const { baseSection } = parseSectionName(sectionName);
  const IconComponent = SECTION_ICON_MAP[baseSection] || FolderIcon;
  return (
    <IconComponent style={{ fontSize: "2rem", color: "var(--pf-v5-global--primary-color--100)" }} />
  );
}

/**
 * Get a friendly display name for the base section (without prefix)
 * Can be overridden by custom section metadata
 */
function getSectionDisplayName(sectionName: string, customSection?: CustomSection): string {
  // Check if there's a custom label for this section
  if (customSection) {
    return customSection.label;
  }

  const { baseSection } = parseSectionName(sectionName);
  // Capitalize first letter
  return baseSection.charAt(0).toUpperCase() + baseSection.slice(1);
}

/**
 * Get the icon for a section, with visual indicator if custom metadata exists
 */
function getSectionIconWithCustom(
  sectionName: string,
  customSection?: CustomSection
): React.ReactNode {
  // Custom icons from store config are not yet implemented.
  // The "Custom" badge is just a visual indicator that this section has custom metadata.
  // TODO: Support custom icons via URLs or icon names in the future.
  if (customSection) {
    return (
      <div className="custom-section-badge">
        {getSectionIcon(sectionName)}
        <Badge isRead aria-label="Custom section configuration">
          Custom
        </Badge>
      </div>
    );
  }

  return getSectionIcon(sectionName);
}

/**
 * Get a friendly display label for the archive area prefix
 */
function getArchiveLabel(prefix: string): string {
  const labels: Record<string, string> = {
    contrib: "Contrib",
    "non-free": "Non-Free",
    "non-free-firmware": "Non-Free Firmware",
  };
  return labels[prefix] || prefix;
}

/**
 * Render an icon for a category with hybrid support
 * Handles both PatternFly icon names and file paths
 *
 * @param iconName PatternFly icon name (e.g., "MapIcon") OR file path (e.g., "/usr/share/...")
 * @param categoryId Category ID for fallback icon selection
 * @returns Icon React node
 */
function renderCategoryIcon(iconName?: string, categoryId?: string): React.ReactNode {
  // If icon is a file path (starts with /), render as image
  if (iconName && iconName.startsWith("/")) {
    return (
      <img src={iconName} alt="" style={{ width: "2rem", height: "2rem", objectFit: "contain" }} />
    );
  }

  // Determine icon component with proper fallback priority
  let IconComponent: React.ComponentType;

  // Try iconName first (for future PatternFly icon name support)
  if (iconName && CATEGORY_ICON_MAP[iconName]) {
    IconComponent = CATEGORY_ICON_MAP[iconName];
  }
  // Fall back to categoryId lookup
  else if (categoryId && CATEGORY_ICON_MAP[categoryId]) {
    IconComponent = CATEGORY_ICON_MAP[categoryId];
  }
  // Final fallback to default icon
  else {
    IconComponent = FolderIcon;
  }

  // Wrap in div for styling since React.ComponentType doesn't guarantee style prop
  return (
    <div style={{ fontSize: "2rem", color: "var(--pf-v5-global--primary-color--100)" }}>
      <IconComponent />
    </div>
  );
}

/**
 * Sort sections by archive area priority, then alphabetically by base section name
 * Main sections come first, then contrib, then non-free variants
 */
function sortSections(
  sections: Array<{ name: string; count: number }>
): Array<{ name: string; count: number }> {
  return [...sections].sort((a, b) => {
    const parsedA = parseSectionName(a.name);
    const parsedB = parseSectionName(b.name);

    // First, sort by archive area priority
    const priorityA = ARCHIVE_PRIORITY[parsedA.area] || 999;
    const priorityB = ARCHIVE_PRIORITY[parsedB.area] || 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Within same archive area, sort alphabetically by base section name
    return parsedA.baseSection.localeCompare(parsedB.baseSection);
  });
}

/**
 * Sort categories alphabetically by label
 */
function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Determines if a store should display categories mode
 * Show categories mode if:
 * - The store has category_metadata configured
 * - The category_metadata array is not empty
 */
function shouldShowCategories(store: Store | undefined): boolean {
  return Boolean(store?.category_metadata && store.category_metadata.length > 0);
}

export const SectionsView: React.FC<SectionsViewProps> = ({ onNavigateToSection }) => {
  const { state } = useApp();

  // Determine if we should show categories or sections based on active store
  const { showCategories, activeStore } = useMemo(() => {
    if (!state.activeStore || !state.stores.length) {
      return { showCategories: false, activeStore: undefined };
    }
    const store = state.stores.find((s) => s.id === state.activeStore);
    return {
      showCategories: shouldShowCategories(store),
      activeStore: store,
    };
  }, [state.activeStore, state.stores]);

  // Conditionally fetch sections or categories
  const {
    data: sections,
    loading: sectionsLoading,
    error: sectionsError,
    refetch: refetchSections,
  } = useSections(
    !showCategories && state.activeStore ? state.activeStore : undefined,
    !showCategories
  );

  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories(
    showCategories && state.activeStore ? state.activeStore : undefined,
    showCategories
  );

  // Unified loading/error/refetch based on which mode we're in
  const loading = showCategories ? categoriesLoading : sectionsLoading;
  const error = showCategories ? categoriesError : sectionsError;
  const refetch = showCategories ? refetchCategories : refetchSections;

  // Get custom sections from active store (for sections mode backward compat)
  const customSections = useMemo(() => {
    if (showCategories || !activeStore) {
      return undefined;
    }
    return activeStore.custom_sections;
  }, [showCategories, activeStore]);

  // Sort data based on mode
  const sortedSections = sections ? sortSections(sections) : [];
  const sortedCategories = categories ? sortCategories(categories) : [];

  const handleSectionClick = (sectionName: string) => {
    if (onNavigateToSection) {
      onNavigateToSection(sectionName);
    }
  };

  // Determine what to display based on mode
  const itemCount = showCategories ? sortedCategories.length : sortedSections.length;
  const heading = showCategories ? "Browse by Category" : "Browse by Section";
  const emptyMessage = showCategories
    ? "No categories found for this store."
    : "No package sections are available in the APT cache.";

  return (
    <>
      <Title headingLevel="h1" size="2xl" style={{ marginBottom: "1.5rem" }}>
        {heading}
      </Title>

      {error && <ErrorAlert error={error} onRetry={refetch} style={{ marginBottom: "1.5rem" }} />}

      {loading && <LoadingSkeleton variant="card" rows={8} />}

      {!loading && !error && itemCount === 0 && (
        <EmptyState
          icon={CubesIcon}
          titleText={`No ${showCategories ? "categories" : "sections"} found`}
          headingLevel="h4"
        >
          <EmptyStateBody>{emptyMessage}</EmptyStateBody>
        </EmptyState>
      )}

      {!loading && !error && itemCount > 0 && (
        <>
          <div style={{ marginBottom: "1rem", color: "var(--pf-v5-global--Color--200)" }}>
            {itemCount} {showCategories ? "categor" : "section"}
            {itemCount !== 1 ? (showCategories ? "ies" : "s") : showCategories ? "y" : ""} available
          </div>

          <Grid hasGutter>
            {showCategories
              ? sortedCategories.map((category) => {
                  const icon = renderCategoryIcon(category.icon, category.id);
                  return (
                    <GridItem key={category.id} sm={6} md={4} lg={3} xl={2}>
                      <CategoryCard
                        category={category}
                        icon={icon}
                        onNavigate={(id) => onNavigateToSection && onNavigateToSection(id)}
                      />
                    </GridItem>
                  );
                })
              : sortedSections.map((section) => {
                  const { prefix } = parseSectionName(section.name);
                  const customSection = customSections?.find((cs) => cs.section === section.name);
                  const displayName = getSectionDisplayName(section.name, customSection);
                  const icon = getSectionIconWithCustom(section.name, customSection);

                  return (
                    <GridItem key={section.name} sm={6} md={4} lg={3} xl={2}>
                      <SectionCard
                        section={section}
                        icon={icon}
                        customSection={customSection}
                        archivePrefix={prefix}
                        archiveLabel={prefix ? getArchiveLabel(prefix) : undefined}
                        displayName={displayName}
                        onNavigate={handleSectionClick}
                      />
                    </GridItem>
                  );
                })}
          </Grid>
        </>
      )}
    </>
  );
};
