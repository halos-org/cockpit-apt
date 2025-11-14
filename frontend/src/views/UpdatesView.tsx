/**
 * UpdatesView - Display available package updates
 *
 * Shows packages that have newer versions available with ability to:
 * - View package details
 * - Upgrade individual packages
 * - Upgrade all packages at once
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
import { CheckCircleIcon, SearchIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { useEffect, useState } from "react";
import type { Package } from "../api/types";
import { ErrorAlert } from "../components/ErrorAlert";
import { useApp } from "../context/AppContext";
import { installPackage } from "../lib/api";

interface UpdatesViewProps {
  onNavigateToPackage: (name: string) => void;
}

export function UpdatesView({ onNavigateToPackage }: UpdatesViewProps) {
  const { state, actions } = useApp();
  const [filterText, setFilterText] = useState("");
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
  const [upgradingPackage, setUpgradingPackage] = useState<string | null>(null);

  // Set tab to "upgradable" on mount
  useEffect(() => {
    actions.setActiveTab("upgradable");
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

  const handleUpgrade = async (packageName: string) => {
    try {
      setUpgradingPackage(packageName);
      await installPackage(packageName); // Install with newer version = upgrade
      // Reload packages after upgrade
      await actions.loadPackages();
    } catch (err) {
      console.error("Upgrade failed:", err);
    } finally {
      setUpgradingPackage(null);
    }
  };

  // Loading state
  if (state.packagesLoading) {
    return (
      <PageSection>
        <Bullseye>
          <EmptyState>
            <Spinner size="xl" aria-label="Loading available updates" />
            <Title headingLevel="h2" size="lg" style={{ marginTop: "1rem" }}>
              Checking for updates...
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
        <Title headingLevel="h1">Available Updates</Title>
        <ErrorAlert error={new Error(state.packagesError)} onRetry={() => actions.loadPackages()} />
      </PageSection>
    );
  }

  // No updates available
  if (state.packages.length === 0) {
    return (
      <PageSection>
        <Title headingLevel="h1">Available Updates</Title>
        <EmptyState icon={CheckCircleIcon} titleText="System is up to date" headingLevel="h2">
          <EmptyStateBody>
            All installed packages are up to date. Check back later for new updates.
          </EmptyStateBody>
          <Button variant="primary" onClick={() => actions.loadPackages()}>
            Check for updates
          </Button>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Title headingLevel="h1">Available Updates</Title>
      <p style={{ marginTop: "8px", marginBottom: "16px", color: "#6a6e73" }}>
        {state.packages.length} {state.packages.length === 1 ? "update" : "updates"} available
      </p>

      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <TextInput
              type="search"
              placeholder="Filter by name or description..."
              value={filterText}
              onChange={(_event, value) => setFilterText(value)}
              aria-label="Filter updates"
            />
          </ToolbarItem>
          <ToolbarItem>
            <Button
              variant="primary"
              onClick={() => {
                // TODO: Implement upgrade all
                console.log("Upgrade all packages");
              }}
              isDisabled={upgradingPackage !== null}
            >
              Upgrade All
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filteredPackages.length === 0 ? (
        <EmptyState icon={SearchIcon} titleText="No matches" headingLevel="h3">
          <EmptyStateBody>
            No updates match &quot;{filterText}&quot;. Try a different search term.
          </EmptyStateBody>
          <Button variant="link" onClick={() => setFilterText("")}>
            Clear filter
          </Button>
        </EmptyState>
      ) : (
        <Table aria-label="Available updates" variant="compact">
          <Thead>
            <Tr>
              <Th>Package</Th>
              <Th>Installed Version</Th>
              <Th>Available Version</Th>
              <Th>Description</Th>
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
                <Td>{pkg.installedVersion || pkg.version}</Td>
                <Td>
                  <strong>{pkg.candidateVersion || pkg.version}</strong>
                </Td>
                <Td>{pkg.summary}</Td>
                <Td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUpgrade(pkg.name)}
                    isLoading={upgradingPackage === pkg.name}
                    isDisabled={upgradingPackage !== null}
                  >
                    Upgrade
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {filteredPackages.length > 0 && filterText && (
        <p style={{ marginTop: "16px", color: "#6a6e73" }}>
          Showing {filteredPackages.length} of {state.packages.length} updates
        </p>
      )}
    </PageSection>
  );
}
