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
import { CheckCircleIcon, ExclamationTriangleIcon, SearchIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { useEffect, useState } from "react";
import type { Package } from "../api/types";
import { ErrorAlert } from "../components/ErrorAlert";
import { useApp } from "../context/AppContext";
import { installPackage, updatePackageLists, upgradeAllPackages } from "../lib/api";

interface UpdatesViewProps {
  onNavigateToPackage: (name: string) => void;
}

export function UpdatesView({ onNavigateToPackage }: UpdatesViewProps) {
  const { state, actions } = useApp();
  const [filterText, setFilterText] = useState("");
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
  const [upgradingPackage, setUpgradingPackage] = useState<string | null>(null);
  const [upgradingAll, setUpgradingAll] = useState(false);
  const [upgradeError, setUpgradeError] = useState<Error | null>(null);
  const [upgradeProgress, setUpgradeProgress] = useState<{
    percentage: number;
    message: string;
  } | null>(null);
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [checkError, setCheckError] = useState<Error | null>(null);

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

  const handleUpgradeAll = async () => {
    try {
      setUpgradingAll(true);
      setUpgradeError(null);
      setUpgradeProgress({ percentage: 0, message: "Starting upgrade..." });
      await upgradeAllPackages((progress) => {
        setUpgradeProgress(progress);
      });
      await actions.loadPackages();
    } catch (err) {
      setUpgradeError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setUpgradingAll(false);
      setUpgradeProgress(null);
    }
  };

  const handleUpgrade = async (packageName: string) => {
    try {
      setUpgradingPackage(packageName);
      setUpgradeError(null);
      await installPackage(packageName); // Install with newer version = upgrade
      await actions.loadPackages();
    } catch (err) {
      setUpgradeError(err instanceof Error ? err : new Error(String(err)));
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

  const handleCheckForUpdates = async () => {
    try {
      setCheckingForUpdates(true);
      setCheckError(null);
      await updatePackageLists();
      await actions.loadPackages();
    } catch (err) {
      setCheckError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setCheckingForUpdates(false);
    }
  };

  // No updates available
  if (state.packages.length === 0) {
    return (
      <PageSection>
        <Title headingLevel="h1">Available Updates</Title>
        {checkError && (
          <ErrorAlert
            error={checkError}
            onDismiss={() => setCheckError(null)}
            title="Failed to check for updates"
            style={{ marginBottom: "1rem" }}
          />
        )}
        {state.aptListsPopulated ? (
          <EmptyState icon={CheckCircleIcon} titleText="System is up to date" headingLevel="h2">
            <EmptyStateBody>
              All installed packages are up to date. Check back later for new updates.
            </EmptyStateBody>
            <Button
              variant="primary"
              onClick={handleCheckForUpdates}
              isLoading={checkingForUpdates}
              isDisabled={checkingForUpdates}
            >
              Check for updates
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={ExclamationTriangleIcon}
            titleText="Package lists not available"
            headingLevel="h2"
          >
            <EmptyStateBody>
              Package lists have not been downloaded yet. Check for updates to download package
              lists and see available updates.
            </EmptyStateBody>
            <Button
              variant="primary"
              onClick={handleCheckForUpdates}
              isLoading={checkingForUpdates}
              isDisabled={checkingForUpdates}
            >
              Check for updates
            </Button>
          </EmptyState>
        )}
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
              onClick={handleUpgradeAll}
              isLoading={upgradingAll}
              isDisabled={upgradingPackage !== null || upgradingAll}
            >
              Upgrade All
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {upgradeError && (
        <ErrorAlert
          error={upgradeError}
          onDismiss={() => setUpgradeError(null)}
          title="Upgrade failed"
          style={{ marginBottom: "1rem" }}
        />
      )}

      {upgradeProgress && (
        <div
          style={{
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: "var(--pf-v5-global--Color--200)",
          }}
        >
          {upgradeProgress.percentage}% - {upgradeProgress.message}
        </div>
      )}

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
                    isDisabled={upgradingPackage !== null || upgradingAll}
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
