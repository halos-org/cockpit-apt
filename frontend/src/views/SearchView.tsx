/**
 * SearchView Component
 *
 * Main search interface for finding packages.
 * Provides search bar, results table, and inline install/remove actions.
 *
 * Features:
 * - Debounced search with loading states
 * - Results table with sortable columns
 * - Install/Remove actions per row
 * - Empty state for no results
 * - Error handling with retry
 * - Loading skeleton during search
 *
 * Usage:
 *   <SearchView onNavigateToPackage={(name) => navigateTo(`/package/${name}`)} />
 */

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Title,
  EmptyState,
  EmptyStateBody,
  Button,
} from "@patternfly/react-core";
import { SearchIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { SearchBar } from "../components/SearchBar";
import { ErrorAlert } from "../components/ErrorAlert";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useApp } from "../context/AppContext";
import type { Package } from "../api/types";

export interface SearchViewProps {
  /** Callback when user clicks on a package to view details */
  onNavigateToPackage?: (packageName: string) => void;

  /** Callback when user installs a package */
  onInstall?: (packageName: string) => Promise<void>;

  /** Callback when user removes a package */
  onRemove?: (packageName: string) => Promise<void>;
}

export const SearchView: React.FC<SearchViewProps> = ({
  onNavigateToPackage,
  onInstall,
  onRemove,
}) => {
  const { state, actions } = useApp();
  const [operatingPackage, setOperatingPackage] = useState<string | null>(null);

  // Set tab to "available" on mount for search context
  useEffect(() => {
    actions.setActiveTab("available");
  }, [actions]);

  const handleInstall = async (packageName: string) => {
    if (!onInstall) return;

    setOperatingPackage(packageName);
    try {
      await onInstall(packageName);
      // Reload packages to update installed status
      await actions.loadPackages();
    } finally {
      setOperatingPackage(null);
    }
  };

  const handleRemove = async (packageName: string) => {
    if (!onRemove) return;

    setOperatingPackage(packageName);
    try {
      await onRemove(packageName);
      // Reload packages to update installed status
      await actions.loadPackages();
    } finally {
      setOperatingPackage(null);
    }
  };

  const handleRowClick = (pkg: Package) => {
    if (onNavigateToPackage) {
      onNavigateToPackage(pkg.name);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Title headingLevel="h2">Search Packages</Title>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <SearchBar
          value={state.searchQuery}
          onChange={actions.setSearchQuery}
          loading={state.packagesLoading}
          placeholder="Search for packages by name or description..."
          style={{ marginBottom: "1.5rem" }}
        />

        {state.packagesError && (
          <ErrorAlert
            error={new Error(state.packagesError)}
            onRetry={() => actions.loadPackages()}
            onDismiss={actions.clearError}
            style={{ marginBottom: "1.5rem" }}
          />
        )}

        {state.packagesLoading && <LoadingSkeleton variant="table" rows={5} />}

        {!state.packagesLoading &&
          !state.packagesError &&
          state.searchQuery.length >= 2 &&
          state.packages.length === 0 && (
            <EmptyState icon={SearchIcon} titleText="No results found" headingLevel="h4">
              <EmptyStateBody>
                No packages match your search query &quot;{state.searchQuery}&quot;. Try different
                keywords or check spelling.
              </EmptyStateBody>
            </EmptyState>
          )}

        {!state.packagesLoading && !state.packagesError && state.searchQuery.length < 2 && (
          <EmptyState icon={SearchIcon} titleText="Start searching" headingLevel="h4">
            <EmptyStateBody>Type at least 2 characters to search for packages.</EmptyStateBody>
          </EmptyState>
        )}

        {!state.packagesLoading &&
          !state.packagesError &&
          state.searchQuery.length >= 2 &&
          state.packages.length > 0 && (
            <>
              <Table aria-label="Search results" variant="compact">
                <Thead>
                  <Tr>
                    <Th>Package</Th>
                    <Th>Summary</Th>
                    <Th>Version</Th>
                    <Th>Section</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {state.packages.map((pkg) => (
                    <Tr
                      key={pkg.name}
                      onClick={() => handleRowClick(pkg)}
                      style={{ cursor: "pointer" }}
                    >
                      <Td>
                        <Button
                          variant="link"
                          isInline
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(pkg);
                          }}
                        >
                          {pkg.name}
                        </Button>
                      </Td>
                      <Td modifier="truncate" style={{ maxWidth: "400px" }}>
                        {pkg.summary}
                      </Td>
                      <Td>{pkg.version}</Td>
                      <Td>{pkg.section}</Td>
                      <Td>
                        {pkg.installed ? (
                          <span style={{ color: "var(--pf-v5-global--success-color--100)" }}>
                            Installed
                          </span>
                        ) : (
                          <span style={{ color: "var(--pf-v5-global--Color--200)" }}>
                            Not installed
                          </span>
                        )}
                      </Td>
                      <Td onClick={(e) => e.stopPropagation()}>
                        {pkg.installed
                          ? onRemove && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRemove(pkg.name)}
                                isLoading={operatingPackage === pkg.name}
                                isDisabled={operatingPackage === pkg.name}
                              >
                                Remove
                              </Button>
                            )
                          : onInstall && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleInstall(pkg.name)}
                                isLoading={operatingPackage === pkg.name}
                                isDisabled={operatingPackage === pkg.name}
                              >
                                Install
                              </Button>
                            )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              <div style={{ marginTop: "1rem", color: "var(--pf-v5-global--Color--200)" }}>
                Showing {state.packages.length} result{state.packages.length !== 1 ? "s" : ""}
                {state.limitedResults && " (limited)"}
              </div>
            </>
          )}
      </CardBody>
    </Card>
  );
};
