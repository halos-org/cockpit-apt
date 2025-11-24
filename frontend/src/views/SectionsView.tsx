/**
 * SectionsView Component
 *
 * Displays Debian sections as a grid of cards.
 * Each card shows section name, package count, and icon.
 */

import { EmptyState, EmptyStateBody, Grid, GridItem, Title } from "@patternfly/react-core";
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
import React from "react";
import { ErrorAlert } from "../components/ErrorAlert";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { SectionCard } from "../components/SectionCard";
import { useSections } from "../hooks/usePackages";

export interface SectionsViewProps {
  onNavigateToSection?: (sectionName: string) => void;
}

const ARCHIVE_PREFIXES = ["contrib/", "non-free/", "non-free-firmware/"] as const;

const ARCHIVE_PRIORITY: Record<string, number> = {
  main: 0,
  contrib: 1,
  "non-free": 2,
  "non-free-firmware": 3,
};

function parseSectionName(sectionName: string): {
  prefix: string | null;
  baseSection: string;
  area: string;
} {
  for (const prefix of ARCHIVE_PREFIXES) {
    if (sectionName.startsWith(prefix)) {
      const baseSection = sectionName.substring(prefix.length);
      const area = prefix.slice(0, -1);
      return { prefix: area, baseSection, area };
    }
  }
  return { prefix: null, baseSection: sectionName, area: "main" };
}

const SECTION_ICON_MAP: Record<string, React.ComponentType> = {
  devel: CodeIcon,
  libdevel: CodeIcon,
  vcs: CodeIcon,
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
  web: GlobeIcon,
  net: NetworkWiredIcon,
  comm: NetworkWiredIcon,
  httpd: ServerIcon,
  news: NetworkWiredIcon,
  mail: EnvelopeIcon,
  sound: VolumeUpIcon,
  video: VolumeUpIcon,
  graphics: ImageIcon,
  games: CubesIcon,
  doc: BookIcon,
  text: BookIcon,
  admin: CogIcon,
  shells: TerminalIcon,
  utils: CogIcon,
  editors: EditIcon,
  kernel: ServerIcon,
  gnome: DesktopIcon,
  kde: DesktopIcon,
  xfce: DesktopIcon,
  x11: DesktopIcon,
  database: DatabaseIcon,
  dbs: DatabaseIcon,
  libs: LayerGroupIcon,
  metapackages: LayerGroupIcon,
};

function getSectionIcon(sectionName: string): React.ReactNode {
  const { baseSection } = parseSectionName(sectionName);
  const IconComponent = SECTION_ICON_MAP[baseSection] || FolderIcon;
  return (
    <IconComponent style={{ fontSize: "2rem", color: "var(--pf-v5-global--primary-color--100)" }} />
  );
}

function getSectionDisplayName(sectionName: string): string {
  const { baseSection } = parseSectionName(sectionName);
  return baseSection.charAt(0).toUpperCase() + baseSection.slice(1);
}

function getArchiveLabel(prefix: string): string {
  const labels: Record<string, string> = {
    contrib: "Contrib",
    "non-free": "Non-Free",
    "non-free-firmware": "Non-Free Firmware",
  };
  return labels[prefix] || prefix;
}

function sortSections(
  sections: Array<{ name: string; count: number }>
): Array<{ name: string; count: number }> {
  return [...sections].sort((a, b) => {
    const parsedA = parseSectionName(a.name);
    const parsedB = parseSectionName(b.name);
    const priorityA = ARCHIVE_PRIORITY[parsedA.area] || 999;
    const priorityB = ARCHIVE_PRIORITY[parsedB.area] || 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return parsedA.baseSection.localeCompare(parsedB.baseSection);
  });
}

export const SectionsView: React.FC<SectionsViewProps> = ({ onNavigateToSection }) => {
  const { data: sections, loading, error, refetch } = useSections();

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
              const displayName = getSectionDisplayName(section.name);
              const icon = getSectionIcon(section.name);

              return (
                <GridItem key={section.name} sm={6} md={4} lg={3} xl={2}>
                  <SectionCard
                    section={section}
                    icon={icon}
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
