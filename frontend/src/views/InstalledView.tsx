/**
 * InstalledView - Display all installed packages
 *
 * Shows a table of installed packages with ability to:
 * - View package details
 * - Remove packages
 * - Filter/search within installed packages
 */

import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  PageSection,
  Spinner,
  TextInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { CubesIcon, SearchIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { useEffect, useState } from "react";
import type { Package } from "../api/types";
import { ErrorAlert } from "../components/ErrorAlert";
import { useApp } from "../context/AppContext";

interface InstalledViewProps {
  onNavigateToPackage: (name: string) => void;
  onRemove: (name: string) => Promise<void>;
}

export function InstalledView({ onNavigateToPackage, onRemove }: InstalledViewProps) {
  const { state, actions } = useApp();
  const [filterText, setFilterText] = useState("");
  const [removingPackage, setRemovingPackage] = useState<string | null>(null);
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);

  // Set tab to "installed" on mount
  useEffect(() => {
    actions.setActiveTab("installed");
  }, [actions]);

  // Filter packages when filter text or packages change
  useEffect(() => {
    if (filterText.trim() === "") {
      setFilteredPackages(state.packages);
    } else {
      const filter = filterText.toLowerCase();
      const filtered = state.packages.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(filter) || pkg.summary.toLowerCase().includes(filter)
      );
      setFilteredPackages(filtered);
    }
  }, [filterText, state.packages]);

  const handleRemove = async (packageName: string) => {
    try {
      setRemovingPackage(packageName);
      await onRemove(packageName);
      // Reload packages after removal
      await actions.loadPackages();
    } catch (err) {
      // Error will be shown by parent component
      console.error("Remove failed:", err);
    } finally {
      setRemovingPackage(null);
    }
  };

  // Loading state
  if (state.packagesLoading) {
    return (
      <PageSection>
        <Bullseye>
          <EmptyState>
            <Spinner size="xl" aria-label="Loading installed packages" />
            <Title headingLevel="h2" size="lg" style={{ marginTop: "1rem" }}>
              Loading installed packages...
            </Title>
          </EmptyState>
        </Bullseye>
      </PageSection>
    );
  }

  // Error state
  if (state.packagesError) {
    return (
      <PageSection>
        <Title headingLevel="h1">Installed Packages</Title>
        <ErrorAlert error={new Error(state.packagesError)} onRetry={() => actions.loadPackages()} />
      </PageSection>
    );
  }

  // Empty state
  if (state.packages.length === 0) {
    return (
      <PageSection>
        <Title headingLevel="h1">Installed Packages</Title>
        <EmptyState icon={CubesIcon} titleText="No packages installed" headingLevel="h2">
          <EmptyStateBody>No installed packages found on this system.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Title headingLevel="h1">Installed Packages</Title>
      <p style={{ marginTop: "8px", marginBottom: "16px", color: "#6a6e73" }}>
        {state.packages.length} packages installed
      </p>

      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <TextInput
              type="search"
              placeholder="Filter by name or description..."
              value={filterText}
              onChange={(_event, value) => setFilterText(value)}
              aria-label="Filter installed packages"
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filteredPackages.length === 0 ? (
        <EmptyState icon={SearchIcon} titleText="No matches" headingLevel="h3">
          <EmptyStateBody>
            No installed packages match &quot;{filterText}&quot;. Try a different search term.
          </EmptyStateBody>
          <Button variant="link" onClick={() => setFilterText("")}>
            Clear filter
          </Button>
        </EmptyState>
      ) : (
        <Table aria-label="Installed packages" variant="compact">
          <Thead>
            <Tr>
              <Th>Package</Th>
              <Th>Version</Th>
              <Th>Description</Th>
              <Th>Section</Th>
              <Th>Actions</Th>
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
                <Td>{pkg.version}</Td>
                <Td>{pkg.summary}</Td>
                <Td>{pkg.section}</Td>
                <Td>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemove(pkg.name)}
                    isLoading={removingPackage === pkg.name}
                    isDisabled={removingPackage !== null}
                  >
                    Remove
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {filteredPackages.length > 0 && filterText && (
        <p style={{ marginTop: "16px", color: "#6a6e73" }}>
          Showing {filteredPackages.length} of {state.packages.length} packages
        </p>
      )}
    </PageSection>
  );
}
