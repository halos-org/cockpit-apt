/**
 * SectionPackageListView - Display packages within a specific Debian section
 *
 * Shows all packages in a section (e.g., "web", "python") with:
 * - Filter options (all/installed/not installed)
 * - Package actions (install/remove)
 * - Breadcrumb navigation
 */

import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  MenuToggle,
  MenuToggleElement,
  PageSection,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { CubesIcon, FilterIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { useEffect, useState } from "react";
import { ErrorAlert } from "../components/ErrorAlert";
import { listPackagesBySection } from "../lib/api";
import { Package } from "../lib/types";

interface SectionPackageListViewProps {
  sectionName: string;
  onNavigateToPackage: (name: string) => void;
  onNavigateToSections: () => void;
  onInstall: (name: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
}

type FilterType = "all" | "installed" | "not-installed";

export function SectionPackageListView({
  sectionName,
  onNavigateToPackage,
  onNavigateToSections,
  onInstall,
  onRemove,
}: SectionPackageListViewProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [actioningPackage, setActioningPackage] = useState<string | null>(null);

  // Load packages in section
  useEffect(() => {
    loadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionName]);

  // Filter packages when filter type changes
  useEffect(() => {
    switch (filterType) {
      case "all":
        setFilteredPackages(packages);
        break;
      case "installed":
        setFilteredPackages(packages.filter((pkg) => pkg.installed));
        break;
      case "not-installed":
        setFilteredPackages(packages.filter((pkg) => !pkg.installed));
        break;
    }
  }, [filterType, packages]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listPackagesBySection(sectionName);
      setPackages(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (packageName: string, action: "install" | "remove") => {
    try {
      setActioningPackage(packageName);
      if (action === "install") {
        await onInstall(packageName);
      } else {
        await onRemove(packageName);
      }
      // Reload packages after action
      await loadPackages();
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActioningPackage(null);
    }
  };

  const getFilterLabel = (): string => {
    switch (filterType) {
      case "all":
        return "All packages";
      case "installed":
        return "Installed only";
      case "not-installed":
        return "Not installed";
    }
  };

  // Loading state
  if (loading) {
    return (
      <PageSection>
        <Bullseye>
          <EmptyState>
            <Spinner size="xl" aria-label={`Loading packages in ${sectionName} section`} />
            <Title headingLevel="h2" size="lg" style={{ marginTop: "1rem" }}>
              Loading {sectionName} packages...
            </Title>
          </EmptyState>
        </Bullseye>
      </PageSection>
    );
  }

  // Error state
  if (error) {
    return (
      <PageSection>
        <Breadcrumb>
          <BreadcrumbItem to="#" onClick={onNavigateToSections}>
            Sections
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{sectionName}</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" style={{ marginTop: "16px" }}>
          {sectionName}
        </Title>
        <ErrorAlert error={error} onRetry={loadPackages} />
      </PageSection>
    );
  }

  // Empty state
  if (packages.length === 0) {
    return (
      <PageSection>
        <Breadcrumb>
          <BreadcrumbItem to="#" onClick={onNavigateToSections}>
            Sections
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{sectionName}</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" style={{ marginTop: "16px" }}>
          {sectionName}
        </Title>
        <EmptyState icon={CubesIcon} titleText="No packages found" headingLevel="h2">
          <EmptyStateBody>No packages found in the {sectionName} section.</EmptyStateBody>
          <Button variant="primary" onClick={onNavigateToSections}>
            Back to sections
          </Button>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Breadcrumb>
          <BreadcrumbItem to="#" onClick={onNavigateToSections}>
            Sections
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{sectionName}</BreadcrumbItem>
        </Breadcrumb>

        <Title headingLevel="h1" style={{ marginTop: "16px" }}>
          {sectionName}
        </Title>
        <p style={{ marginTop: "8px", marginBottom: "16px", color: "#6a6e73" }}>
          {filteredPackages.length} packages
        </p>

        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Select
                isOpen={isFilterOpen}
                onSelect={(_event, value) => {
                  setFilterType(value as FilterType);
                  setIsFilterOpen(false);
                }}
                onOpenChange={(isOpen) => setIsFilterOpen(isOpen)}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    icon={<FilterIcon />}
                  >
                    {getFilterLabel()}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="all">All packages</SelectOption>
                  <SelectOption value="installed">Installed only</SelectOption>
                  <SelectOption value="not-installed">Not installed</SelectOption>
                </SelectList>
              </Select>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection padding={{ default: "noPadding" }}>
        {filteredPackages.length === 0 ? (
          <EmptyState icon={FilterIcon} titleText="No packages match filter" headingLevel="h3">
            <EmptyStateBody>
              No packages match the current filter. Try selecting a different filter.
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <Table aria-label={`Packages in ${sectionName} section`} variant="compact">
            <Thead>
              <Tr>
                <Th>Package</Th>
                <Th width={15}>Version</Th>
                <Th>Description</Th>
                <Th width={10}>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredPackages.map((pkg) => (
                <Tr key={pkg.name}>
                  <Td>
                    <Button variant="link" isInline onClick={() => onNavigateToPackage(pkg.name)}>
                      {pkg.name}
                    </Button>
                  </Td>
                  <Td modifier="truncate" style={{ maxWidth: "150px" }}>
                    {pkg.version}
                  </Td>
                  <Td>{pkg.summary}</Td>
                  <Td>
                    {pkg.installed ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleAction(pkg.name, "remove")}
                        isLoading={actioningPackage === pkg.name}
                        isDisabled={actioningPackage !== null}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAction(pkg.name, "install")}
                        isLoading={actioningPackage === pkg.name}
                        isDisabled={actioningPackage !== null}
                      >
                        Install
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </>
  );
}
