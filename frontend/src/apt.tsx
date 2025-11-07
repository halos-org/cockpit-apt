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
    Page,
    PageSidebar,
    PageSidebarBody,
    Masthead,
    MastheadMain,
    MastheadBrand,
    MastheadLogo,
    PageSection,
    Nav,
    NavList,
    NavItem,
    Title,
} from '@patternfly/react-core';
import { SearchIcon, CubesIcon, LayerGroupIcon, ArrowUpIcon } from '@patternfly/react-icons';
import { SearchView } from './views/SearchView';
import { SectionsView } from './views/SectionsView';
import { PackageDetailsView } from './views/PackageDetailsView';
// Import both PatternFly CSS files
// patternfly-base.css contains design tokens (--pf-t--global--* variables)
// patternfly.css contains component styles that reference those tokens
// Both are required for proper styling!
import '@patternfly/patternfly/patternfly-base.css';
import '@patternfly/patternfly/patternfly.css';

/**
 * Route type for type-safe routing
 */
interface Route {
    view: 'search' | 'sections' | 'section-packages' | 'package-details' | 'installed' | 'updates';
    params: Record<string, string>;
}

/**
 * Parse cockpit.location.path to extract view and params
 */
function parseRoute(path: string[]): Route {
    // Default to search view
    if (path.length === 0 || path[0] !== 'apt') {
        return { view: 'search', params: {} };
    }

    const subpath = path.slice(1);

    // /apt or /apt/search
    if (subpath.length === 0 || subpath[0] === 'search') {
        return { view: 'search', params: {} };
    }

    // /apt/sections
    if (subpath[0] === 'sections') {
        if (subpath.length === 1) {
            return { view: 'sections', params: {} };
        }
        // /apt/sections/:section
        return { view: 'section-packages', params: { section: subpath[1] } };
    }

    // /apt/package/:name
    if (subpath[0] === 'package' && subpath.length > 1) {
        return { view: 'package-details', params: { name: subpath[1] } };
    }

    // /apt/installed
    if (subpath[0] === 'installed') {
        return { view: 'installed', params: {} };
    }

    // /apt/updates
    if (subpath[0] === 'updates') {
        return { view: 'updates', params: {} };
    }

    // Default fallback
    return { view: 'search', params: {} };
}

/**
 * Navigate to a route
 */
function navigateTo(path: string) {
    cockpit.location.go(['apt', ...path.split('/').filter(Boolean)]);
}

/**
 * Main application component
 */
function App() {
    const [route, setRoute] = useState<Route>(parseRoute(cockpit.location.path));
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Listen to cockpit location changes
    useEffect(() => {
        const handleLocationChange = () => {
            setRoute(parseRoute(cockpit.location.path));
        };

        // Initial route
        handleLocationChange();

        // Listen for changes
        const cleanup = cockpit.addEventListener('locationchanged', handleLocationChange);

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

    // Install/Remove handlers (stubs for now - will show errors from api.ts)
    const handleInstall = async (packageName: string) => {
        try {
            const { installPackage } = await import('./lib/api');
            await installPackage(packageName);
        } catch (error) {
            console.error('Install error:', error);
            // Error will be shown by the component
            throw error;
        }
    };

    const handleRemove = async (packageName: string) => {
        try {
            const { removePackage } = await import('./lib/api');
            await removePackage(packageName);
        } catch (error) {
            console.error('Remove error:', error);
            // Error will be shown by the component
            throw error;
        }
    };

    // Determine active nav item
    const getActiveItem = () => {
        switch (route.view) {
            case 'search':
                return 'search';
            case 'sections':
            case 'section-packages':
                return 'sections';
            case 'installed':
                return 'installed';
            case 'updates':
                return 'updates';
            default:
                return 'search';
        }
    };

    // Render navigation
    const nav = (
        <Nav aria-label="Global">
            <NavList>
                <NavItem
                    itemId="search"
                    isActive={getActiveItem() === 'search'}
                    onClick={handleNavigateToSearch}
                >
                    <SearchIcon /> Search
                </NavItem>
                <NavItem
                    itemId="sections"
                    isActive={getActiveItem() === 'sections'}
                    onClick={handleNavigateToSections}
                >
                    <LayerGroupIcon /> Sections
                </NavItem>
                <NavItem
                    itemId="installed"
                    isActive={getActiveItem() === 'installed'}
                    onClick={handleNavigateToInstalled}
                >
                    <CubesIcon /> Installed
                </NavItem>
                <NavItem
                    itemId="updates"
                    isActive={getActiveItem() === 'updates'}
                    onClick={handleNavigateToUpdates}
                >
                    <ArrowUpIcon /> Updates
                </NavItem>
            </NavList>
        </Nav>
    );

    const sidebar = (
        <PageSidebar>
            <PageSidebarBody>{nav}</PageSidebarBody>
        </PageSidebar>
    );

    const masthead = (
        <Masthead>
            <MastheadMain>
                <MastheadBrand>
                    <MastheadLogo>
                        <Title headingLevel="h1" size="2xl">
                            APT Package Manager
                        </Title>
                    </MastheadLogo>
                </MastheadBrand>
            </MastheadMain>
        </Masthead>
    );

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
                    <PageSection>
                        <Title headingLevel="h1">
                            Packages in {route.params.section}
                        </Title>
                        <p>Section package list view - Coming soon</p>
                    </PageSection>
                );

            case 'package-details':
                return (
                    <PackageDetailsView
                        packageName={route.params.name}
                        onInstall={handleInstall}
                        onRemove={handleRemove}
                        onBack={handleBack}
                    />
                );

            case 'installed':
                return (
                    <PageSection>
                        <Title headingLevel="h1">Installed Packages</Title>
                        <p>Installed packages view - Coming soon</p>
                    </PageSection>
                );

            case 'updates':
                return (
                    <PageSection>
                        <Title headingLevel="h1">Available Updates</Title>
                        <p>Updates view - Coming soon</p>
                    </PageSection>
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
        <Page
            masthead={masthead}
            sidebar={sidebar}
            isManagedSidebar
            defaultManagedSidebarIsOpen={isSidebarOpen}
            onPageResize={(_event, { mobileView, windowSize }) => {
                setIsSidebarOpen(!mobileView);
            }}
        >
            {renderView()}
        </Page>
    );
}

// Initialize React app
const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
