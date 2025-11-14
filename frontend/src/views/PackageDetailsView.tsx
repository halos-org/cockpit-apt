/**
 * PackageDetailsView Component
 *
 * Comprehensive package information display with tabbed interface.
 * Shows description, metadata, dependencies, and actions.
 *
 * Features:
 * - Header with package name, version, and status
 * - Tabbed interface (Overview, Dependencies)
 * - Overview: Description, metadata, homepage link
 * - Dependencies: List with version constraints
 * - Install/Remove action buttons
 * - Loading state during fetch
 * - Error handling with retry
 *
 * Usage:
 *   <PackageDetailsView
 *     packageName="nginx"
 *     onInstall={handleInstall}
 *     onRemove={handleRemove}
 *   />
 */

import React, { useState, useEffect } from 'react';
import {
    PageSection,
    Title,
    Tabs,
    Tab,
    TabTitleText,
    DescriptionList,
    DescriptionListGroup,
    DescriptionListTerm,
    DescriptionListDescription,
    Button,
    Flex,
    FlexItem,
    Badge,
    Label,
    Divider,
    Spinner,
    TextInput,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, CheckCircleIcon, ArrowLeftIcon } from '@patternfly/react-icons';
import { ErrorAlert } from '../components/ErrorAlert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { usePackageDetails } from '../hooks/usePackages';
import { getPackageFiles, installPackage, removePackage } from '../lib/api';

export interface PackageDetailsViewProps {
    /** Package name to display */
    packageName: string;

    /** Callback when user installs the package */
    onInstall?: (packageName: string) => Promise<void>;

    /** Callback when user removes the package */
    onRemove?: (packageName: string) => Promise<void>;

    /** Callback to navigate back */
    onBack?: () => void;
}

export const PackageDetailsView: React.FC<PackageDetailsViewProps> = ({
    packageName,
    onInstall,
    onRemove,
    onBack,
}) => {
    const [activeTab, setActiveTab] = useState<string | number>(0);
    const [operating, setOperating] = useState(false);
    const [operationProgress, setOperationProgress] = useState<{ percentage: number; message: string } | null>(null);
    const [files, setFiles] = useState<string[] | null>(null);
    const [filesLoading, setFilesLoading] = useState(false);
    const [filesError, setFilesError] = useState<Error | null>(null);
    const [fileFilter, setFileFilter] = useState('');

    const { data: details, loading, error, refetch } = usePackageDetails(packageName);

    // Add Escape key handler to go back
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && onBack) {
                onBack();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onBack]);

    // Load files when Files tab is activated
    useEffect(() => {
        if (activeTab === 2 && details?.installed && files === null && !filesLoading) {
            const loadFiles = async () => {
                setFilesLoading(true);
                setFilesError(null);
                try {
                    const result = await getPackageFiles(packageName);
                    setFiles(result);
                } catch (err) {
                    setFilesError(err as Error);
                } finally {
                    setFilesLoading(false);
                }
            };
            loadFiles();
        }
    }, [activeTab, details?.installed, packageName, files, filesLoading]);

    const handleInstall = async () => {
        if (!details) return;

        setOperating(true);
        setOperationProgress({ percentage: 0, message: 'Starting installation...' });
        try {
            // Call API directly with progress callback
            await installPackage(details.name, (progress) => {
                setOperationProgress(progress);
            });

            // Refetch to update installed status (silently, without loading skeleton)
            await refetch();

            // Also call the optional parent callback for any side effects
            if (onInstall) {
                try {
                    await onInstall(details.name);
                } catch (e) {
                    // Ignore errors from parent callback
                    console.warn('Parent onInstall callback failed:', e);
                }
            }
        } catch (error) {
            // TODO: Show error alert to user
            console.error('Install failed:', error);
            throw error;
        } finally {
            setOperating(false);
            setOperationProgress(null);
        }
    };

    const handleRemove = async () => {
        if (!details) return;

        setOperating(true);
        setOperationProgress({ percentage: 0, message: 'Starting removal...' });
        try {
            // Call API directly with progress callback
            await removePackage(details.name, (progress) => {
                setOperationProgress(progress);
            });

            // Refetch to update installed status (silently, without loading skeleton)
            await refetch();

            // Also call the optional parent callback for any side effects
            if (onRemove) {
                try {
                    await onRemove(details.name);
                } catch (e) {
                    // Ignore errors from parent callback
                    console.warn('Parent onRemove callback failed:', e);
                }
            }
        } catch (error) {
            // TODO: Show error alert to user
            console.error('Remove failed:', error);
            throw error;
        } finally {
            setOperating(false);
            setOperationProgress(null);
        }
    };

    if (error) {
        return (
            <PageSection>
                <ErrorAlert
                    error={error}
                    onRetry={refetch}
                    title="Failed to load package details"
                />
                {onBack && (
                    <Button variant="link" onClick={onBack} style={{ marginTop: '1rem' }}>
                        Go back
                    </Button>
                )}
            </PageSection>
        );
    }

    if (loading) {
        return (
            <PageSection>
                <LoadingSkeleton variant="details" />
            </PageSection>
        );
    }

    if (!details) {
        return (
            <PageSection>
                <Title headingLevel="h1">Package not found</Title>
            </PageSection>
        );
    }

    return (
        <PageSection>
            {/* Back button */}
            {onBack && (
                <Button
                    variant="link"
                    onClick={onBack}
                    icon={<ArrowLeftIcon />}
                    style={{ marginBottom: '1rem', paddingLeft: 0 }}
                    aria-label="Go back to previous page (Escape)"
                >
                    Back
                </Button>
            )}

            {/* Header */}
            <Flex
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                alignItems={{ default: 'alignItemsCenter' }}
                style={{ marginBottom: '1.5rem' }}
            >
                <FlexItem>
                    <Title headingLevel="h1" size="2xl">
                        {details.name}
                    </Title>
                    <div style={{ marginTop: '0.5rem' }}>
                        {details.installed && (
                            <Label color="green" icon={<CheckCircleIcon />}>
                                Installed
                            </Label>
                        )}
                        {' '}
                        <Badge isRead>{details.candidateVersion || details.installedVersion}</Badge>
                        {' '}
                        <Badge isRead>{details.section}</Badge>
                    </div>
                </FlexItem>

                <FlexItem>
                    {details.installed ? (
                        <div>
                            <Button
                                variant="danger"
                                onClick={handleRemove}
                                isLoading={operating}
                                isDisabled={operating}
                            >
                                {operating ? 'Removing...' : 'Remove Package'}
                            </Button>
                            {operationProgress && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--pf-v5-global--Color--200)' }}>
                                    {operationProgress.percentage}% - {operationProgress.message}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <Button
                                variant="primary"
                                onClick={handleInstall}
                                isLoading={operating}
                                isDisabled={operating}
                            >
                                {operating ? 'Installing...' : 'Install Package'}
                            </Button>
                            {operationProgress && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--pf-v5-global--Color--200)' }}>
                                    {operationProgress.percentage}% - {operationProgress.message}
                                </div>
                            )}
                        </div>
                    )}
                </FlexItem>
            </Flex>

            {/* Summary */}
            <div style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                {details.summary}
            </div>

            <Divider style={{ marginBottom: '1.5rem' }} />

            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onSelect={(_event, tabIndex) => setActiveTab(tabIndex)}
            >
                <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
                    <div style={{ paddingTop: '1.5rem' }}>
                        {/* Description */}
                        <Title headingLevel="h3" size="lg" style={{ marginBottom: '1rem' }}>
                            Description
                        </Title>
                        <div style={{
                            whiteSpace: 'pre-wrap',
                            marginBottom: '2rem',
                            lineHeight: '1.6',
                        }}>
                            {details.description}
                        </div>

                        {/* Metadata */}
                        <Title headingLevel="h3" size="lg" style={{ marginBottom: '1rem' }}>
                            Details
                        </Title>
                        <DescriptionList isHorizontal>
                            <DescriptionListGroup>
                                <DescriptionListTerm>Version</DescriptionListTerm>
                                <DescriptionListDescription>
                                    {details.candidateVersion || 'N/A'}
                                </DescriptionListDescription>
                            </DescriptionListGroup>

                            {details.installed && details.installedVersion && (
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Installed Version</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        {details.installedVersion}
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                            )}

                            <DescriptionListGroup>
                                <DescriptionListTerm>Section</DescriptionListTerm>
                                <DescriptionListDescription>
                                    {details.section}
                                </DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                                <DescriptionListTerm>Priority</DescriptionListTerm>
                                <DescriptionListDescription>
                                    {details.priority}
                                </DescriptionListDescription>
                            </DescriptionListGroup>

                            {details.maintainer && (
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Maintainer</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        {details.maintainer}
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                            )}

                            {details.homepage && (
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Homepage</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        <a
                                            href={details.homepage}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {details.homepage}
                                            {' '}
                                            <ExternalLinkAltIcon />
                                        </a>
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                            )}

                            <DescriptionListGroup>
                                <DescriptionListTerm>Download Size</DescriptionListTerm>
                                <DescriptionListDescription>
                                    {formatBytes(details.size)}
                                </DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                                <DescriptionListTerm>Installed Size</DescriptionListTerm>
                                <DescriptionListDescription>
                                    {formatBytes(details.installedSize)}
                                </DescriptionListDescription>
                            </DescriptionListGroup>
                        </DescriptionList>
                    </div>
                </Tab>

                <Tab eventKey={1} title={<TabTitleText>Dependencies ({details.dependencies.length})</TabTitleText>}>
                    <div style={{ paddingTop: '1.5rem' }}>
                        {details.dependencies.length === 0 ? (
                            <div>No dependencies</div>
                        ) : (
                            <DescriptionList isCompact>
                                {details.dependencies.map((dep, index) => (
                                    <DescriptionListGroup key={index}>
                                        <DescriptionListTerm>{dep.name}</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {dep.relation && dep.version ? (
                                                <Badge isRead>{dep.relation} {dep.version}</Badge>
                                            ) : (
                                                <span style={{ color: 'var(--pf-v5-global--Color--200)' }}>
                                                    Any version
                                                </span>
                                            )}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                ))}
                            </DescriptionList>
                        )}

                        {details.reverseDependencies && details.reverseDependencies.length > 0 && (
                            <>
                                <Divider style={{ margin: '2rem 0' }} />
                                <Title headingLevel="h3" size="lg" style={{ marginBottom: '1rem' }}>
                                    Reverse Dependencies ({details.reverseDependencies.length})
                                </Title>
                                <div style={{ color: 'var(--pf-v5-global--Color--200)', marginBottom: '1rem' }}>
                                    Packages that depend on this package (max 50 shown)
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {details.reverseDependencies.map((pkgName) => (
                                        <Badge key={pkgName} isRead>{pkgName}</Badge>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </Tab>

                {/* Files tab - only shown for installed packages */}
                {details.installed && (
                    <Tab eventKey={2} title={<TabTitleText>Files{files ? ` (${files.length})` : ''}</TabTitleText>}>
                        <div style={{ paddingTop: '1.5rem' }}>
                            {filesLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <Spinner size="lg" aria-label="Loading files" />
                                    <div style={{ marginTop: '1rem' }}>Loading files...</div>
                                </div>
                            ) : filesError ? (
                                <ErrorAlert error={filesError} onRetry={() => {
                                    setFiles(null);
                                    setFilesError(null);
                                }} />
                            ) : files ? (
                                <>
                                    {/* Filter input */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <TextInput
                                            type="search"
                                            placeholder="Filter files by path..."
                                            value={fileFilter}
                                            onChange={(_event, value) => setFileFilter(value)}
                                            aria-label="Filter files"
                                        />
                                    </div>

                                    {/* File list */}
                                    {(() => {
                                        const filteredFiles = fileFilter
                                            ? files.filter(f => f.toLowerCase().includes(fileFilter.toLowerCase()))
                                            : files;

                                        if (filteredFiles.length === 0) {
                                            return (
                                                <div style={{ color: 'var(--pf-v5-global--Color--200)', padding: '1rem' }}>
                                                    No files match filter &quot;{fileFilter}&quot;
                                                </div>
                                            );
                                        }

                                        return (
                                            <>
                                                <div style={{
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.9rem',
                                                    maxHeight: '500px',
                                                    overflowY: 'auto',
                                                    border: '1px solid var(--pf-v5-global--BorderColor--100)',
                                                    borderRadius: '3px',
                                                    padding: '0.5rem'
                                                }}>
                                                    {filteredFiles.map((file, index) => (
                                                        <div
                                                            key={index}
                                                            style={{
                                                                padding: '0.25rem 0.5rem',
                                                                borderBottom: index < filteredFiles.length - 1
                                                                    ? '1px solid var(--pf-v5-global--BorderColor--100)'
                                                                    : 'none'
                                                            }}
                                                        >
                                                            {file}
                                                        </div>
                                                    ))}
                                                </div>
                                                {fileFilter && (
                                                    <div style={{ marginTop: '0.5rem', color: 'var(--pf-v5-global--Color--200)' }}>
                                                        Showing {filteredFiles.length} of {files.length} files
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </>
                            ) : null}
                        </div>
                    </Tab>
                )}
            </Tabs>
        </PageSection>
    );
};

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
