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

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  Grid,
  GridItem,
  Title,
} from "@patternfly/react-core";
import {
  BookIcon,
  CodeIcon,
  CogIcon,
  CubesIcon,
  DatabaseIcon,
  DesktopIcon,
  EditIcon,
  EnvelopeIcon,
  FolderIcon,
  GlobeIcon,
  ImageIcon,
  LayerGroupIcon,
  NetworkWiredIcon,
  ServerIcon,
  TerminalIcon,
  VolumeUpIcon,
} from "@patternfly/react-icons";
import React, { useMemo } from "react";
import type { CustomSection } from "../api/types";
import { ErrorAlert } from "../components/ErrorAlert";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useApp } from "../context/AppContext";
import { useSections } from "../hooks/usePackages";

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

export const SectionsView: React.FC<SectionsViewProps> = ({ onNavigateToSection }) => {
  const { state } = useApp();
  const { data: sections, loading, error, refetch } = useSections();

  // Get custom sections from active store
  const customSections = useMemo(() => {
    if (!state.activeStore || !state.stores.length) {
      return undefined;
    }
    const activeStore = state.stores.find((s) => s.id === state.activeStore);
    return activeStore?.custom_sections;
  }, [state.activeStore, state.stores]);

  // Sort sections by archive area and base name
  const sortedSections = sections ? sortSections(sections) : [];

  const handleSectionClick = (sectionName: string) => {
    if (onNavigateToSection) {
      onNavigateToSection(sectionName);
    }
  };

  return (
    <>
      <Title headingLevel="h1" size="2xl" style={{ marginBottom: "1.5rem" }}>
        Browse by Section
      </Title>

      {error && <ErrorAlert error={error} onRetry={refetch} style={{ marginBottom: "1.5rem" }} />}

      {loading && <LoadingSkeleton variant="card" rows={8} />}

      {!loading && !error && sortedSections.length === 0 && (
        <EmptyState icon={CubesIcon} titleText="No sections found" headingLevel="h4">
          <EmptyStateBody>No package sections are available in the APT cache.</EmptyStateBody>
        </EmptyState>
      )}

      {!loading && !error && sortedSections.length > 0 && (
        <>
          <div style={{ marginBottom: "1rem", color: "var(--pf-v5-global--Color--200)" }}>
            {sortedSections.length} section{sortedSections.length !== 1 ? "s" : ""} available
          </div>

          <Grid hasGutter>
            {sortedSections.map((section) => {
              const { prefix } = parseSectionName(section.name);
              const customSection = customSections?.find((cs) => cs.section === section.name);
              const displayName = getSectionDisplayName(section.name, customSection);
              const icon = getSectionIconWithCustom(section.name, customSection);

              return (
                <GridItem key={section.name} sm={6} md={4} lg={3} xl={2}>
                  <Card
                    isClickable
                    onClick={() => handleSectionClick(section.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSectionClick(section.name);
                      }
                    }}
                    style={{ height: "100%" }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${section.count} packages in ${prefix ? `${getArchiveLabel(prefix)} ` : ""}${displayName} section`}
                  >
                    <CardHeader>{icon}</CardHeader>

                    <CardTitle>
                      {prefix && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "normal",
                            color: "var(--pf-v5-global--Color--200)",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {getArchiveLabel(prefix)}
                        </div>
                      )}
                      {displayName}
                    </CardTitle>

                    <CardBody>
                      <div>
                        <Badge isRead>
                          {section.count} package{section.count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      {customSection?.description && (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            fontSize: "0.875rem",
                            color: "var(--pf-v5-global--Color--200)",
                          }}
                        >
                          {customSection.description}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </GridItem>
              );
            })}
          </Grid>
        </>
      )}
    </>
  );
};
