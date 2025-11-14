/**
 * UpdatesView - Display available package updates
 *
 * Shows packages that have newer versions available with ability to:
 * - View package details
 * - Upgrade individual packages
 * - Upgrade all packages at once
 */

import { useState, useEffect } from 'react';
import {
    PageSection,
    Title,
    Button,
    EmptyState,
    EmptyStateBody,
    Toolbar,
    ToolbarContent,
    ToolbarItem,
    TextInput,
    Spinner,
    Bullseye,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon, SearchIcon } from '@patternfly/react-icons';
import { listUpgradablePackages, installPackage } from '../lib/api';
import { UpgradablePackage } from '../lib/types';
import { ErrorAlert } from '../components/ErrorAlert';

interface UpdatesViewProps {
    onNavigateToPackage: (name: string) => void;
}

export function UpdatesView({ onNavigateToPackage }: UpdatesViewProps) {
    const [packages, setPackages] = useState<UpgradablePackage[]>([]);
    const [filteredPackages, setFilteredPackages] = useState<UpgradablePackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [filterText, setFilterText] = useState('');
    const [upgradingPackage, setUpgradingPackage] = useState<string | null>(null);

    // Load upgradable packages
    useEffect(() => {
        loadPackages();
    }, []);

    // Filter packages when filter text changes
    useEffect(() => {
        if (filterText.trim() === '') {
            setFilteredPackages(packages);
        } else {
            const filter = filterText.toLowerCase();
            const filtered = packages.filter(
                pkg =>
                    pkg.name.toLowerCase().includes(filter) ||
                    pkg.summary.toLowerCase().includes(filter)
            );
            setFilteredPackages(filtered);
        }
    }, [filterText, packages]);

    const loadPackages = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await listUpgradablePackages(false); // Don't use cache for fresh data
            setPackages(result);
            setFilteredPackages(result);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (packageName: string) => {
        try {
            setUpgradingPackage(packageName);
            setError(null);
            await installPackage(packageName); // Install with newer version = upgrade
            // Reload packages after upgrade
            await loadPackages();
        } catch (err) {
            setError(err as Error);
            console.error('Upgrade failed:', err);
        } finally {
            setUpgradingPackage(null);
        }
    };

    // Loading state
    if (loading) {
        return (
            <PageSection>
                <Bullseye>
                    <EmptyState>
                        <Spinner size="xl" aria-label="Loading available updates" />
                        <Title headingLevel="h2" size="lg" style={{ marginTop: '1rem' }}>
                            Checking for updates...
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
                <Title headingLevel="h1">Available Updates</Title>
                <ErrorAlert error={error} onRetry={loadPackages} />
            </PageSection>
        );
    }

    // No updates available
    if (packages.length === 0) {
        return (
            <PageSection>
                <Title headingLevel="h1">Available Updates</Title>
                <EmptyState icon={CheckCircleIcon} titleText="System is up to date" headingLevel="h2">
                    <EmptyStateBody>
                        All installed packages are up to date. Check back later for new updates.
                    </EmptyStateBody>
                    <Button variant="primary" onClick={loadPackages}>
                        Check for updates
                    </Button>
                </EmptyState>
            </PageSection>
        );
    }

    return (
        <PageSection>
            <Title headingLevel="h1">Available Updates</Title>
            <p style={{ marginTop: '8px', marginBottom: '16px', color: '#6a6e73' }}>
                {packages.length} {packages.length === 1 ? 'update' : 'updates'} available
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
                                console.log('Upgrade all packages');
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
                    <Button variant="link" onClick={() => setFilterText('')}>
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
                        {filteredPackages.map(pkg => (
                            <Tr key={pkg.name}>
                                <Td>
                                    <Button
                                        variant="link"
                                        isInline
                                        onClick={() => onNavigateToPackage(pkg.name)}
                                    >
                                        {pkg.name}
                                    </Button>
                                </Td>
                                <Td>{pkg.installedVersion}</Td>
                                <Td>
                                    <strong>{pkg.candidateVersion}</strong>
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
                <p style={{ marginTop: '16px', color: '#6a6e73' }}>
                    Showing {filteredPackages.length} of {packages.length} updates
                </p>
            )}
        </PageSection>
    );
}
