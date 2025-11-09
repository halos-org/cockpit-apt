/**
 * Cockpit APT - Root React component
 *
 * Main application component with routing and navigation.
 * Uses cockpit.location for client-side routing without page reloads.
 *
 * Routes:
 * - /apt or /apt/search - Search view
 * - /apt/sections - Browse sections
 * - /apt/sections/:section - Packages in section
 * - /apt/package/:name - Package details
 * - /apt/installed - Installed packages (future)
 * - /apt/updates - Available updates (future)
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
    Tabs,
    Tab,
    TabTitleText,
    Title,
    Page,
    PageSection,
    Stack,
} from '@patternfly/react-core';
import { SearchIcon, CubesIcon, LayerGroupIcon, ArrowUpIcon } from '@patternfly/react-icons';
import { SearchView } from './views/SearchView';
import { SectionsView } from './views/SectionsView';
import { PackageDetailsView } from './views/PackageDetailsView';
import { InstalledView } from './views/InstalledView';
import { UpdatesView } from './views/UpdatesView';
import { SectionPackageListView } from './views/SectionPackageListView';
// Import both PatternFly CSS files
// patternfly-base.css contains design tokens (--pf-t--global--* variables)
// patternfly.css contains component styles that reference those tokens
// Both are required for proper styling!
import '@patternfly/patternfly/patternfly-base.css';
import '@patternfly/patternfly/patternfly.css';
// Import dark theme support (must be after PatternFly CSS)
import './dark-theme';

/**
 * Route type for type-safe routing
 */
interface Route {
    view: 'search' | 'sections' | 'section-packages' | 'package-details' | 'installed' | 'updates';
    params: Record<string, string>;
}

/**
 * Parse cockpit.location.path to extract view and params
 *
 * Cockpit provides paths like ['apt', 'sections', 'admin']
 * We handle paths starting with or without 'apt'
 */
function parseRoute(path: string[]): Route {
    // Handle both ['apt', ...] and [...]
    const subpath = path[0] === 'apt' ? path.slice(1) : path;

    // Default to search view
    if (subpath.length === 0 || subpath[0] === 'search') {
        return { view: 'search', params: {} };
    }

    // /sections
    if (subpath[0] === 'sections') {
        if (subpath.length === 1) {
            return { view: 'sections', params: {} };
        }
        // /sections/:section
        return { view: 'section-packages', params: { section: subpath[1] || '' } };
    }

    // /package/:name
    if (subpath[0] === 'package' && subpath.length > 1) {
        return { view: 'package-details', params: { name: subpath[1] || '' } };
    }

    // /installed
    if (subpath[0] === 'installed') {
        return { view: 'installed', params: {} };
    }

    // /updates
    if (subpath[0] === 'updates') {
        return { view: 'updates', params: {} };
    }

    // Default fallback
    return { view: 'search', params: {} };
}

/**
 * Navigate to a route
 *
 * cockpit.location.go() expects paths relative to the module
 * e.g., ['sections', 'admin'] becomes /apt#/sections/admin
 */
function navigateTo(path: string) {
    cockpit.location.go(path.split('/').filter(Boolean));
}

/**
 * Main application component
 */
function App() {
    const [route, setRoute] = useState<Route>(parseRoute(cockpit.location.path));

    // Listen to cockpit location changes
    useEffect(() => {
        const handleLocationChange = () => {
            setRoute(parseRoute(cockpit.location.path));
        };

        // Initial route
        handleLocationChange();

        // Listen for changes
        const cleanup = (cockpit as any).addEventListener('locationchanged', handleLocationChange);

        return cleanup;
    }, []);

    // Navigation handlers
    const handleNavigateToSearch = () => navigateTo('search');
    const handleNavigateToSections = () => navigateTo('sections');
    const handleNavigateToSection = (section: string) => navigateTo(`sections/${section}`);
    const handleNavigateToPackage = (name: string) => navigateTo(`package/${name}`);
    const handleNavigateToInstalled = () => navigateTo('installed');
    const handleNavigateToUpdates = () => navigateTo('updates');
    const handleBack = () => window.history.back();

    // Install/Remove notification handlers
    // These are called AFTER the operation completes in child components
    // Used for side effects like invalidating caches, showing notifications, etc.
    const handleInstall = async (packageName: string) => {
        // Child component already performed the install
        // Just log for now - could add toast notifications here
        console.log('Package installed:', packageName);
    };

    const handleRemove = async (packageName: string) => {
        // Child component already performed the remove
        // Just log for now - could add toast notifications here
        console.log('Package removed:', packageName);
    };

    // Determine active tab
    const getActiveTab = () => {
        switch (route.view) {
            case 'search':
                return 0;
            case 'sections':
            case 'section-packages':
                return 1;
            case 'installed':
                return 2;
            case 'updates':
                return 3;
            default:
                return 0;
        }
    };

    // Handle tab change
    const handleTabChange = (_event: React.MouseEvent<HTMLElement, MouseEvent>, tabIndex: number | string) => {
        switch (tabIndex) {
            case 0:
                handleNavigateToSearch();
                break;
            case 1:
                handleNavigateToSections();
                break;
            case 2:
                handleNavigateToInstalled();
                break;
            case 3:
                handleNavigateToUpdates();
                break;
        }
    };

    // Render current view
    const renderView = () => {
        switch (route.view) {
            case 'search':
                return (
                    <SearchView
                        onNavigateToPackage={handleNavigateToPackage}
                        onInstall={handleInstall}
                        onRemove={handleRemove}
                    />
                );

            case 'sections':
                return (
                    <SectionsView
                        onNavigateToSection={handleNavigateToSection}
                    />
                );

            case 'section-packages':
                return (
                    <SectionPackageListView
                        sectionName={route.params.section || ''}
                        onNavigateToPackage={handleNavigateToPackage}
                        onNavigateToSections={handleNavigateToSections}
                        onInstall={handleInstall}
                        onRemove={handleRemove}
                    />
                );

            case 'package-details':
                return (
                    <PackageDetailsView
                        packageName={route.params.name || ''}
                        onInstall={handleInstall}
                        onRemove={handleRemove}
                        onBack={handleBack}
                    />
                );

            case 'installed':
                return (
                    <InstalledView
                        onNavigateToPackage={handleNavigateToPackage}
                        onRemove={handleRemove}
                    />
                );

            case 'updates':
                return (
                    <UpdatesView
                        onNavigateToPackage={handleNavigateToPackage}
                    />
                );

            default:
                return (
                    <PageSection>
                        <Title headingLevel="h1">Not Found</Title>
                        <p>Page not found</p>
                    </PageSection>
                );
        }
    };

    return (
        <Page>
            <PageSection padding={{ default: 'noPadding' }}>
                <Tabs
                    activeKey={getActiveTab()}
                    onSelect={handleTabChange}
                    isBox={false}
                    aria-label="APT navigation"
                >
                    <Tab
                        eventKey={0}
                        title={
                            <TabTitleText>
                                <SearchIcon /> Search
                            </TabTitleText>
                        }
                    />
                    <Tab
                        eventKey={1}
                        title={
                            <TabTitleText>
                                <LayerGroupIcon /> Sections
                            </TabTitleText>
                        }
                    />
                    <Tab
                        eventKey={2}
                        title={
                            <TabTitleText>
                                <CubesIcon /> Installed
                            </TabTitleText>
                        }
                    />
                    <Tab
                        eventKey={3}
                        title={
                            <TabTitleText>
                                <ArrowUpIcon /> Updates
                            </TabTitleText>
                        }
                    />
                </Tabs>
            </PageSection>
            <PageSection hasBodyWrapper={false}>
                <Stack hasGutter>
                    {renderView()}
                </Stack>
            </PageSection>
        </Page>
    );
}

// Initialize React app
const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
