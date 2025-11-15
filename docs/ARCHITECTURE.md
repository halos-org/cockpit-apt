# System Architecture: Container Store Filtering

**Status**: Draft
**Date**: 2025-11-14
**Component**: cockpit-apt

## Overview

This document describes the system architecture for container store filtering and repository management features in cockpit-apt. It details component relationships, data flows, technology decisions, and implementation patterns.

## System Context

cockpit-apt is a Cockpit web interface module that provides APT package management. The container store features extend this to support curated package collections while maintaining backward compatibility as a general-purpose package manager.

**Key Architectural Principles**:
1. **Progressive Enhancement**: Features appear only when needed
2. **Separation of Concerns**: Backend handles APT logic, frontend handles presentation
3. **Stateless Backend**: No persistent daemon, spawned on-demand via cockpit.spawn
4. **Type Safety**: Strict TypeScript on frontend, type hints on backend
5. **Testability**: Mock-friendly architecture with clear boundaries

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cockpit Web Interface                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │             cockpit-apt Frontend                    │     │
│  │  (React + TypeScript + PatternFly)                 │     │
│  │                                                     │     │
│  │  ┌──────────────┐  ┌─────────────────────────┐   │     │
│  │  │   UI Layer   │  │    State Management     │   │     │
│  │  │ Components   │  │  (React Context + hooks)│   │     │
│  │  └──────────────┘  └─────────────────────────┘   │     │
│  │          │                    │                    │     │
│  │          └────────────────────┘                    │     │
│  │                   │                                │     │
│  │          ┌────────▼────────┐                       │     │
│  │          │   API Wrapper   │                       │     │
│  │          │ (TypeScript)    │                       │     │
│  │          └────────┬────────┘                       │     │
│  └───────────────────┼─────────────────────────────────┘     │
│                      │                                       │
│                      │ cockpit.spawn()                       │
│                      │ (JSON stdin/stdout)                   │
└──────────────────────┼───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              cockpit-apt Backend (Python)                    │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │                  CLI Interface                      │     │
│  │        (Command parser + JSON formatter)           │     │
│  └─────────────┬──────────────────────────────────────┘     │
│                │                                             │
│  ┌─────────────▼─────────────┐  ┌──────────────────┐       │
│  │   Command Handlers         │  │  Store Config    │       │
│  │  • stores list             │  │    Loader        │       │
│  │  • repositories list       │  └──────────────────┘       │
│  │  • packages filter         │                             │
│  │  • search, details, etc.   │  ┌──────────────────┐       │
│  └────────────┬───────────────┘  │   Debtag         │       │
│               │                  │   Parser         │       │
│  ┌────────────▼───────────────┐  └──────────────────┘       │
│  │      APT Cache Wrapper      │                             │
│  │    (python-apt adapter)     │  ┌──────────────────┐       │
│  └─────────────────────────────┘  │   Repository     │       │
│                                   │   Metadata       │       │
│                                   │   Parser         │       │
│                                   └──────────────────┘       │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    APT/dpkg System                           │
│                                                               │
│  • APT Cache (/var/cache/apt/)                              │
│  • Package Lists (/var/lib/apt/lists/)                      │
│  • Store Configs (/etc/container-apps/stores/)              │
│  • Installed Packages (dpkg database)                        │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Architecture

The frontend follows a layered architecture with clear separation between presentation, state management, and API communication.

#### UI Layer Components

**StoreToggleGroup Component**
- Provides toggle button interface for switching between System and store views
- Conditionally renders only when store packages are installed
- Uses PatternFly ToggleGroup component for consistent styling
- Emits store selection events to parent components

**RepositoryDropdown Component**
- Dropdown selector for filtering by repository origin
- Always present in UI but hidden when only one repository exists
- Shows context-sensitive repository list based on active store
- Uses PatternFly Dropdown component

**SoftwarePage Component**
- Top-level page component that integrates all UI elements
- Manages layout of store toggle, repository dropdown, and existing tabs
- Coordinates between new filtering UI and existing Browse/Search/Installed/Updates tabs
- Orchestrates data flow between components

**Package Display Components** (existing, unchanged)
- PackageList: Displays filtered package results
- SectionGrid: Shows package sections (standard and custom)
- PackageDetails: Shows detailed package information
- These components consume filtered data without knowledge of filter sources

#### State Management Layer

**Global Application State**
- Manages stores, repositories, packages, and UI state
- Implemented using React Context API for prop drilling avoidance
- Provides centralized state updates and action dispatchers
- Coordinates filter cascade and package refresh logic

**Persistent State Storage**
- Uses browser localStorage for session persistence
- Stores active store selection, active repository, last viewed tab
- Handles storage quota errors gracefully
- Provides typed getters and setters for type safety

**Filter State Management**
- Tracks active filters: store, repository, search query, tab
- Computes filtered package lists using memoization
- Triggers backend API calls when filters change
- Maintains filter cascade order: store → repository → tab

#### API Wrapper Layer

**Purpose and Responsibilities**
- Abstracts cockpit.spawn communication details from UI components
- Provides type-safe Promise-based API for backend commands
- Handles JSON serialization and deserialization
- Translates backend errors into user-friendly messages
- Manages command execution lifecycle and error recovery

**Command Interface**
- listStores: Retrieves available store definitions
- listRepositories: Enumerates APT repositories with optional store filtering
- filterPackages: Applies filter criteria and returns matching packages
- Existing commands: search, details, install, remove (unchanged)

### Backend Architecture

The backend is a stateless command-line interface that executes commands and returns JSON output. Each invocation is independent with no persistent state.

#### CLI Interface Layer

**Command Dispatcher**
- Main entry point that parses command-line arguments
- Routes commands to appropriate handler functions
- Catches and formats exceptions as JSON error responses
- Ensures consistent JSON output format for all commands

**JSON Protocol**
- All communication uses JSON format for structure and type safety
- Commands receive arguments as command-line parameters
- Results returned as JSON to stdout
- Errors returned as JSON with error codes and messages

#### Command Handler Layer

**Store Commands**
- list: Loads and returns all store configurations from filesystem
- Scans store configuration directory for YAML files
- Parses and validates each store configuration
- Returns store metadata without filter execution

**Repository Commands**
- list: Enumerates APT repositories from package origins
- Optionally filters repositories by store's package set
- Counts packages per repository for UI display
- Deduplicates repositories by origin and suite combination

**Filter Commands**
- filter: Applies cascading filters to package list
- Supports store filter, repository filter, search query
- Implements filter matching logic with proper precedence
- Limits result size to prevent performance issues

**Existing Commands** (unchanged)
- search: Full-text package search
- details: Package metadata retrieval
- install/remove: Package management operations
- These integrate with new filter system transparently

#### Utility Modules

**Store Configuration Loader**
- Scans and loads YAML store configurations from filesystem
- Validates store definitions against expected schema
- Caches loaded configurations in memory for performance
- Handles missing or malformed configuration files gracefully

**Store Filter Matcher**
- Implements filter matching logic for store definitions
- Applies OR logic within filter categories (origins, sections, tags, explicit packages)
- Applies AND logic between categories (all specified categories must match)
- Optimized for performance with large package lists

**Debtag Parser**
- Extracts Tag field from package metadata
- Parses comma-separated faceted tag lists
- Splits tags into facet and value components
- Handles missing Tag field gracefully

**Repository Metadata Parser**
- Extracts repository information from python-apt package origins
- Retrieves Origin and Label fields from APT Release files
- Associates packages with their source repositories
- Builds repository index for efficient lookups

**APT Cache Wrapper**
- Abstracts python-apt cache operations
- Converts APT package objects to JSON-serializable dictionaries
- Handles APT cache initialization and error cases
- Provides consistent error handling across commands

## Data Models

### Store Configuration Structure

Store configurations are YAML files installed by store definition packages. Each store defines:

**Identity and Metadata**
- Unique identifier (used in URLs and storage keys)
- Display name shown in UI
- Description explaining store purpose
- Optional icon and banner image paths for branding

**Filter Specification**
- Include origins: List of repository Origin values to include
- Include sections: List of Debian package sections to include
- Include tags: List of debtags that qualify packages
- Include packages: Explicit package names to include
- All filters are optional, at least one must be specified
- OR logic within each filter category, AND logic between categories

**Custom Section Metadata**
- Overrides for standard Debian section labels and descriptions
- Custom sections not in standard Debian taxonomy
- Icon and description for each custom section
- Used for specialized categorization within stores

### Package Data Model

Package data retrieved from python-apt includes:

**Core Package Attributes**
- Name, version, architecture, section
- Installation status and available updates
- Package size and dependencies

**Filter-Related Attributes**
- Repository origin and label
- Debtags (comma-separated faceted tags)
- Standard and custom section classification

**Display Attributes**
- Short and long descriptions
- Maintainer information
- Homepage URL

### Repository Data Model

Repository metadata extracted from APT:

**Identity Information**
- Unique identifier (origin:suite combination)
- Origin field from Release file (preferred for display)
- Label field from Release file (fallback for display)
- Suite and codename

**Contextual Information**
- Package count (total or filtered by active store)
- Components (main, contrib, non-free)
- Architectures supported

## Data Flow Diagrams

### Store Loading Flow

```
User opens cockpit-apt
       ↓
Frontend: useEffect hook on component mount
       ↓
API Wrapper: listStores() call
       ↓
cockpit.spawn(['python3', '-m', 'cockpit_apt_bridge', 'stores', 'list'])
       ↓
Backend: stores_command() handler
       ↓
Scan /etc/container-apps/stores/ directory
       ↓
Parse each *.yaml file and validate structure
       ↓
Create store configuration objects
       ↓
Convert to JSON and output to stdout
       ↓
Frontend: Parse JSON response
       ↓
Update application state with store list
       ↓
StoreToggleGroup component renders (if stores exist)
```

### Filter Cascade Flow

```
User selects "Marine Apps" store from toggle group
       ↓
StoreToggleGroup: onStoreChange event handler
       ↓
AppContext: setActiveStore action dispatcher
       ↓
Save selection to localStorage for persistence
       ↓
Trigger refreshPackages() to reload with filters
       ↓
API Wrapper: filterPackages() with current filter state
       ↓
cockpit.spawn with filter criteria as arguments
       ↓
Backend: filter_command() handler receives criteria
       ↓
Load store configuration for selected store
       ↓
Get APT cache (in-memory package database)
       ↓
Apply store filter (origins, sections, tags, explicit packages)
       ↓
Apply repository filter (if repository selected)
       ↓
Apply search filter (if search query present)
       ↓
Limit results to prevent UI performance issues
       ↓
Convert filtered packages to JSON
       ↓
Frontend: Parse JSON response
       ↓
Update filteredPackages in application state
       ↓
PackageList and SectionGrid components re-render with filtered data
```

### Repository Enumeration Flow

```
User opens cockpit-apt (parallel with store loading)
       ↓
Frontend: Load repositories in parallel with stores
       ↓
API Wrapper: listRepositories() with optional store context
       ↓
cockpit.spawn with optional store_id parameter
       ↓
Backend: repositories_command() handler
       ↓
Get APT cache and iterate all packages
       ↓
Extract origin information from each package
       ↓
Deduplicate repositories by (origin, suite) combination
       ↓
If store context provided: filter to repositories with packages in store
       ↓
Count packages in each repository (considering active store filter)
       ↓
Sort repositories alphabetically
       ↓
Convert to JSON with id, name, origin, label, suite, packageCount
       ↓
Frontend: Parse JSON response
       ↓
Update repositories in application state
       ↓
RepositoryDropdown renders (if more than one repository)
```

### Filter Cascade Logic Detail

```
All Packages (from APT cache)
       ↓
[Store Filter Applied - if store selected]
   - Match ANY of: origin in include_origins
   - Match ANY of: section in include_sections
   - Match ANY of: tag in include_tags
   - Match ANY of: name in include_packages
   - ALL specified filter types must match (AND logic between types)
       ↓
Filtered by Store (or all packages if System selected)
       ↓
[Repository Filter Applied - if repository selected]
   - Keep only packages from selected repository origin
       ↓
Filtered by Repository (or all from previous step)
       ↓
[Tab Filter Applied]
   - Browse: All packages
   - Search: Match search query
   - Installed: Only installed packages
   - Updates: Only packages with updates available
       ↓
Final Filtered Package List
       ↓
Display in UI components
```

## Technology Stack

### Frontend Technologies

**Core Framework**
- React 18: Component-based UI framework with hooks
- TypeScript 5: Static typing for JavaScript
- PatternFly 6: Red Hat's open source design system and component library

**Build and Development**
- esbuild: Fast JavaScript bundler
- vitest: Unit testing framework compatible with vite
- React Testing Library: Component testing utilities

**Runtime Environment**
- Modern web browsers with ES2020 support
- Cockpit web framework integration
- Browser localStorage API for persistence

### Backend Technologies

**Core Runtime**
- Python 3.11+: Backend scripting language
- python-apt: Official Python bindings for APT
- PyYAML: YAML parsing library

**Development Tools**
- uv: Fast Python package manager and task runner
- ruff: Fast Python linter and formatter (replaces flake8, black, isort)
- pyright: Static type checker for Python
- pytest: Testing framework with extensive plugin ecosystem

### Integration Technologies

**Communication**
- Cockpit spawn API: Process execution with stdin/stdout
- JSON: Structured data interchange format
- Browser localStorage: Client-side persistent storage

**System Integration**
- APT package management system
- dpkg package database
- systemd for service management (container apps)

## File System Layout

### Store Configuration Files

**Location**: `/etc/container-apps/stores/`
- Contains YAML configuration files for each installed store
- One file per store: `marine.yaml`, `devtools.yaml`, etc.
- Installed by store definition packages via APT
- Read by backend on each store list command

### Store Branding Assets

**Location**: `/usr/share/container-stores/`
- Contains icons, banners, and other branding assets
- Organized by store ID: `marine/`, `devtools/`, etc.
- Referenced by absolute paths in store configurations
- Served by Cockpit's static file handler

### APT Repository Metadata

**Location**: `/var/lib/apt/lists/`
- Contains Release files with repository metadata
- Package list files with package metadata including tags
- Maintained automatically by APT
- Parsed by python-apt and our backend utilities

### APT Cache

**Location**: `/var/cache/apt/`
- Binary cache of package information
- Managed automatically by APT
- Accessed via python-apt in read-only mode

## Integration Points

### Cockpit Integration

**Module Registration**
- Manifest file defines module name, version, menu entry
- Installed to Cockpit's module directory
- Appears in Cockpit navigation menu
- Follows Cockpit's visual design guidelines

**Process Spawning**
- Backend commands executed via cockpit.spawn API
- Supports superuser escalation when needed
- Provides stderr capture for error reporting
- Handles process lifecycle and cleanup

**Authentication**
- Leverages Cockpit's session management
- Inherits user authentication state
- Supports both regular and superuser operations
- Read-only operations don't require privilege escalation

### APT Integration

**python-apt Library**
- Provides object-oriented interface to APT
- Handles cache loading and package iteration
- Exposes package metadata including custom fields
- Manages package origins and version information

**Package Metadata Access**
- Access to standard Debian package fields
- Access to custom fields like Tag for debtags
- Origin information from package version objects
- Section, description, dependencies, and more

**Read-Only Operations**
- Store filtering uses only read operations on APT cache
- No modifications to APT state
- No package installations or removals in filter logic
- Safe to run without elevated privileges

### Existing cockpit-apt Integration

**Backward Compatibility**
- All existing commands continue to function unchanged
- New filter layer operates transparently
- Vanilla mode works without any store packages
- Package installation and removal unaffected

**Shared Infrastructure**
- Reuses existing command infrastructure
- Shares APT cache wrapper utilities
- Uses same JSON communication protocol
- Integrates with existing error handling

**UI Integration Points**
- Store toggle and repository dropdown integrate above existing tabs
- Filter state passes through to existing package lists
- Section grid supports both standard and custom sections
- Search functionality works within filtered package sets

## Security Considerations

### Privilege Separation

**Frontend Security**
- Runs in browser sandbox with no direct system access
- Cannot access filesystem or execute commands directly
- All system operations go through Cockpit spawn API
- Subject to Cockpit's authentication and authorization

**Backend Privileges**
- Read operations run without elevated privileges
- Store config reading requires file system read access
- APT cache access is read-only
- Write operations (install/remove) require sudo via Cockpit

**Cockpit Security Layer**
- Manages authentication and session handling
- Provides privilege escalation when needed
- Audits all privileged operations
- Isolates processes per user session

### Input Validation

**Backend Validation**
- All command arguments validated before processing
- YAML parsing uses safe_load (no code execution risk)
- Path traversal prevention for store config file access
- Query length limits prevent denial of service

**Filter Validation**
- Store IDs validated against loaded store list
- Repository IDs validated against enumerated repositories
- Tag and section filters validated against known values
- Result size limits prevent memory exhaustion

### Store Configuration Trust

**Installation Trust Model**
- Store configs installed only via APT packages
- APT packages cryptographically signed by repository
- Users trust repository keys explicitly
- Standard Debian/Ubuntu trust chain applies

**Configuration Safety**
- YAML configs cannot execute code
- Filters can only select existing packages
- No network access during filter evaluation
- No ability to modify APT state from filters

**Asset Safety**
- Branding assets (icons, banners) are static files
- Served by Cockpit's safe file handler
- Cannot execute code or access system resources
- Standard web browser security applies

## Performance Optimization

### Frontend Performance

**React Optimization**
- Memoization of expensive filter computations using useMemo
- Callback memoization with useCallback to prevent re-renders
- Component code splitting for faster initial load
- Lazy loading of store branding assets

**UI Responsiveness**
- Debouncing of search queries (300ms delay)
- Virtual scrolling for package lists with 1000+ items
- Optimistic UI updates before backend confirmation
- Progressive rendering of section grids

**State Management**
- Batched state updates to minimize re-renders
- Selective component updates via React Context
- Memoized selectors for derived state
- Efficient localStorage access patterns

### Backend Performance

**Caching Strategy**
- APT cache loaded once and kept in memory by python-apt
- Store configurations cached after first load
- Repository metadata indexed for O(1) lookups
- Parsed tag lists cached per package

**Filter Optimization**
- Most restrictive filters applied first
- Short-circuit evaluation for OR logic
- Early termination when result limit reached
- Lazy evaluation of package metadata

**Result Management**
- Hard limit on result count (1000 packages)
- Pagination support for large result sets
- Minimal data transfer (only needed fields)
- Efficient JSON serialization

### Performance Targets

**Load Time Goals**
- Initial page load: <2 seconds
- Store config loading: <50ms
- Repository enumeration: <200ms
- Package filter execution: <100ms for 10,000 packages

**UI Responsiveness Goals**
- UI interactions: <16ms response time (60 FPS)
- Filter change feedback: Immediate (optimistic)
- Search query debounce: 300ms
- Virtual scroll smoothness: 60 FPS

## Deployment Architecture

### Package Dependencies

**cockpit-apt Package**
- Depends: cockpit (>= 270)
- Depends: python3-apt
- Depends: python3-yaml
- Suggests: various *-container-store packages
- No runtime daemon or background services

**Store Definition Packages**
- Naming: `<store-id>-container-store`
- Depends: cockpit-apt (>= 0.2.0)
- Installs: YAML config and branding assets
- No runtime dependencies beyond filesystem

**Container App Packages**
- Naming: `<app-name>-container`
- Depends: docker-ce or docker.io
- Recommends: appropriate store definition package
- Tagged with debtags for store filtering

### Installation Flow

**Standard Installation**
1. Install cockpit-apt via APT (provides base functionality)
2. Optionally install store definition packages
3. Optionally install container app packages
4. No configuration required - works out of box

**Progressive Enhancement**
- With only cockpit-apt: Full vanilla APT manager
- With store packages: Store toggle appears automatically
- With container apps: Apps appear in relevant stores
- All combinations work without manual configuration

**Upgrade Path**
- Existing cockpit-apt users get new features transparently
- No breaking changes to existing functionality
- No data migration required
- Store features appear when store packages installed

## CI/CD Pipeline

### GitHub Actions Workflows

The project uses GitHub Actions for continuous integration and deployment. The CI/CD pipeline consists of three main workflows:

> **Note on draft-release.yml:**
> There is also an existing `draft-release.yml` workflow that runs on push to `main`.
> It creates draft releases with source code only (no .deb packages) and reads the version from `frontend/package.json`.
> With the introduction of `auto-prerelease.yml`, the intention is to migrate release automation to the new workflow.
> For now, both workflows may coexist, but `draft-release.yml` should be considered deprecated and will be removed once `auto-prerelease.yml` is fully validated.

#### 1. Build and Test Workflow (build.yml)

**Trigger**: Pull requests and pushes to main

**Purpose**: Validate code quality and test coverage

**Jobs**:

**Backend Job**:
- Runs in Docker container (python-apt requires Linux)
- Executes pytest test suite (129 tests)
- Runs ruff linting
- Reports coverage metrics

**Frontend Job**:
- Sets up Node.js 18
- Installs dependencies via npm
- Builds TypeScript/React code
- Runs vitest test suite (156 tests)

**Wait Time**: ~3-5 minutes for all checks

**Quality Gates**:
- All tests must pass
- No linting errors
- TypeScript compilation successful

#### 2. Automatic Pre-Release Workflow (auto-prerelease.yml)

**Trigger**: Push to main branch

**Purpose**: Continuous delivery to unstable APT channel

**Process Flow**:

```
Push to main
    ↓
Read version from debian/changelog
    ↓
Check for stable release with same/higher version
    ↓
    ├─ Stable exists → Skip (log and exit)
    ├─ No stable or version higher → Continue
    ↓
Setup build environment
    ↓
Build .deb package (dpkg-buildpackage)
    ↓
Check if pre-release with version tag exists
    ↓
    ├─ Exists → Delete old pre-release and tag
    ├─ Does not exist → Continue
    ↓
Create pre-release with version tag (e.g., v0.2.0)
    ↓
Mark as pre-release (GitHub checkbox)
    ↓
Attach .deb package to release
    ↓
Dispatch to apt.hatlabs.fi
    - Event: package-updated
    - Payload: {repository, distro: "any", channel: "unstable", component: "main"}
    ↓
apt.hatlabs.fi downloads .deb from latest pre-release
    ↓
Package available in unstable APT distribution
```

**Version Comparison Logic**:
- Extract version from `debian/changelog` (e.g., "0.2.0-1")
- List all non-draft, non-prerelease releases
- Parse version numbers using semantic versioning
- Skip if stable ≥ current version

**Benefits**:
- Every commit to main results in installable package
- Rapid iteration for unstable channel users
- No manual release management needed
- Pre-releases automatically replaced (not accumulated)

**Limitations**:
- Only creates pre-releases (not stable releases)
- Requires version bump in debian/changelog for new stable releases
- Pre-releases with same version replace each other

#### 3. Stable Release Workflow (release.yml)

**Trigger**: Release published (manual action in GitHub UI)

**Purpose**: Dispatch stable releases to APT repository

**Process Flow**:

```
Developer publishes release
    ↓
Workflow detects release.published event
    ↓
Determine channel based on release type
    - Pre-release checkbox checked → "unstable"
    - Regular release → "stable"
    ↓
Dispatch to apt.hatlabs.fi
    - Event: package-updated
    - Payload: {repository, distro: "any", channel, component: "main"}
    ↓
apt.hatlabs.fi downloads .deb from release assets
    ↓
Package available in appropriate APT distribution
```

**Note**: This workflow does NOT build packages. The .deb package must already be attached to the release (typically by the auto-prerelease workflow or manual upload).

**Channel Determination**:
- GitHub pre-release → unstable channel → `unstable` distribution
- Regular release → stable channel → `stable` distribution

### APT Repository Integration Architecture

#### Repository Structure

**Location**: https://apt.hatlabs.fi (GitHub Pages)

**Distributions**:
- `stable`: Cross-Debian stable releases (bookworm, trixie, etc.)
- `unstable`: Rolling pre-releases
- `bookworm-stable`, `bookworm-unstable`: Debian 12 specific
- `trixie-stable`, `trixie-unstable`: Debian 13 specific

**Components**: `main`

**Architectures**: `arm64`, `all`

#### Integration Protocol

**Communication**: GitHub repository dispatch

**Event Type**: `package-updated`

**Payload Format**:
```json
{
  "repository": "hatlabs/cockpit-apt",
  "distro": "any" | "bookworm" | "trixie",
  "channel": "stable" | "unstable",
  "component": "main"
}
```

**Distribution Resolution**:
```
distro="any", channel="stable"    → stable
distro="any", channel="unstable"  → unstable
distro="bookworm", channel="stable" → bookworm-stable
distro="trixie", channel="stable"   → trixie-stable
```

#### Package Download Process

**Triggered Update Mode** (from package repositories):

1. apt.hatlabs.fi receives `package-updated` dispatch
2. Determines release to download based on channel:
   - `unstable` channel → downloads from latest pre-release (by date)
   - `stable` channel → downloads from tag "latest"
3. Fetches release from GitHub API
4. Downloads all `.deb` files from release assets
5. Extracts package metadata (name, version, architecture)
6. Copies to APT repository pool
7. Generates Packages files for target distribution
8. Signs Release file with GPG key
9. Deploys to GitHub Pages

**Note**: The apt.hatlabs.fi workflow currently downloads from tag "unstable" for the unstable channel. This needs to be updated to download from the latest pre-release instead. See apt.hatlabs.fi repository issue for implementation details.

**Full Rebuild Mode** (scheduled daily):

1. Discovers all repositories with `apt-package` topic
2. Downloads latest stable releases from each
3. Rebuilds all stable distributions
4. Unstable distributions unchanged (require targeted updates)

#### Security

**Package Signing**:
- All repository metadata signed with Hat Labs GPG key
- Release file signed with detached signature (Release.gpg)
- InRelease file includes embedded signature
- Users verify with: `gpg --import hat-labs-apt-key.asc`

**Package Trust Chain**:
1. Store definition packages installed via APT
2. APT packages signed by repository GPG key
3. Repository GPG key trusted by user
4. Standard Debian/Ubuntu trust model applies

**Access Control**:
- Dispatch events require `REPO_DISPATCH_PAT` token
- Only authorized repositories can trigger updates
- GitHub API token scoped to repository access only

### Deployment Flow Diagram

```
Developer workflow:
    ↓
Code changes → PR → Review → Merge to main
    ↓
[Automatic Pre-Release Workflow]
    ↓
Build .deb → Create/update "unstable" pre-release
    ↓
Dispatch to apt.hatlabs.fi (channel: unstable)
    ↓
Package available at https://apt.hatlabs.fi/pool/main/
    ↓
Users on unstable channel: apt update && apt install cockpit-apt
    ↓
Testing and validation
    ↓
[Manual Action: Publish stable release]
    ↓
Dispatch to apt.hatlabs.fi (channel: stable)
    ↓
Package available in stable distribution
    ↓
Production users: apt update && apt upgrade
```

### Build Environment

**Package Building**:
- Ubuntu 22.04 runner (GitHub Actions)
- Build dependencies: `dpkg-dev`, `debhelper`, `nodejs`, `npm`, `python3-pip`
- Build command: `dpkg-buildpackage -b -uc -us` (binary package, unsigned)
- Output: `cockpit-apt_VERSION_ARCH.deb`

**Build Process**:
1. Install Node.js and build frontend: `cd frontend && npm ci && npm run build`
2. Install Python backend: `cd backend && pip3 install --prefix=/usr --root=debian/tmp .`
3. Copy built files to package structure (debian/rules)
4. Run dpkg-buildpackage to create .deb

**Build Time**: ~2-3 minutes for complete package

### Monitoring and Observability

**Workflow Status**:
- GitHub Actions tab shows all workflow runs
- Failed builds visible in commit status
- Email notifications for workflow failures

**Release Tracking**:
- All releases visible in GitHub Releases page
- Pre-releases tagged with version numbers (e.g., v0.2.0) and marked as pre-release
- Stable releases tagged with version numbers (e.g., v0.2.0) and published as regular releases

**APT Repository Status**:
- Repository index at https://apt.hatlabs.fi
- Package lists per distribution
- Last update timestamp visible

### Failure Handling

**Build Failures**:
- Workflow fails, pre-release not created
- Error visible in GitHub Actions logs
- Developer notified via GitHub
- Main branch remains deployable (last successful build)

**Dispatch Failures**:
- Token expiration: Update REPO_DISPATCH_PAT secret
- Network issues: apt.hatlabs.fi workflow retries automatically
- Package download failures: Logged in apt.hatlabs.fi workflow

**Recovery Procedures**:
1. **Failed build**: Fix issue, commit to main, automatic retry
2. **Failed dispatch**: Re-run workflow from GitHub Actions UI
3. **Corrupted release**: Delete release, push dummy commit to main
4. **Missing package in APT repo**: Manual trigger of apt.hatlabs.fi workflow

## Error Handling Strategy

### Backend Error Categories

**Configuration Errors**
- Invalid YAML syntax in store configs
- Missing required fields in store definitions
- Invalid paths to branding assets
- Reported with specific error codes and actionable messages

**APT Errors**
- APT cache loading failures
- Package metadata parsing errors
- Missing or corrupted package lists
- Fallback to cached data when possible

**Filter Errors**
- Invalid store IDs
- Unknown repository IDs
- Malformed filter criteria
- Return empty results rather than failing

**System Errors**
- File system access errors
- Permission denied errors
- Out of memory conditions
- Graceful degradation with user notification

### Frontend Error Handling

**Network Errors**
- Backend communication failures
- Timeout handling with retry logic
- User notification with retry option
- Graceful fallback to cached data

**State Errors**
- Invalid filter state recovery
- localStorage quota exceeded handling
- Corrupted persistent state recovery
- Reset to safe defaults when needed

**UI Error Display**
- Toast notifications for transient errors
- Inline error messages for context-specific issues
- Modal dialogs for critical errors requiring user action
- Error boundaries to prevent full page crashes

### Error Recovery

**Automatic Recovery**
- Retry transient errors with exponential backoff
- Fall back to System view if store becomes invalid
- Clear invalid filters automatically
- Reload store list if store package installed/removed

**User-Initiated Recovery**
- Clear filters button to reset to known good state
- Refresh action to reload all data from backend
- Reinstall store packages if configs corrupted
- Contact support for persistent errors

## Testing Architecture

### Unit Testing Strategy

**Backend Unit Tests**
- Test each command handler in isolation
- Mock python-apt cache for deterministic tests
- Test store config loading and parsing
- Test filter matching logic with various criteria
- Test debtag parsing edge cases
- Test repository metadata extraction

**Frontend Unit Tests**
- Test components in isolation with React Testing Library
- Mock API wrapper for predictable responses
- Test state management logic
- Test filter cascade implementation
- Test localStorage persistence
- Test error handling and recovery

### Integration Testing Strategy

**Frontend Integration Tests**
- Test component interaction and data flow
- Test filter cascade from UI to filtered results
- Test store toggle affecting repository dropdown
- Test persistence across simulated page reloads
- Test error propagation through layers

**Backend Integration Tests**
- Test with real python-apt against test package database
- Test store config loading from test directory
- Test filter commands with realistic package data
- Test performance with large package sets

### End-to-End Testing

**Manual E2E Testing**
- Test against live Cockpit installation
- Install real store packages and verify behavior
- Test all filter combinations
- Verify package install/remove still works
- Test across different Debian/Ubuntu versions

**Automated E2E Tests** (future)
- Playwright or similar for browser automation
- Requires test environment with Cockpit
- Test complete user workflows
- Test across browsers

## Migration and Compatibility

### Backward Compatibility

**Vanilla Mode Support**
- Fully functional without any store packages installed
- Store toggle hidden when no stores present
- Repository dropdown works independently of stores
- All existing functionality preserved exactly

**Existing Command Compatibility**
- All existing commands unchanged in interface
- JSON output format remains consistent
- Error codes and messages unchanged
- Performance characteristics maintained

**Data Compatibility**
- No changes to package data format
- No new required fields
- Optional debtags parsed when present
- Graceful handling of missing metadata

**UI Compatibility**
- Existing UI components work without modification
- New components integrate seamlessly
- No visual regressions in vanilla mode
- Same PatternFly version and styling

### Migration Path

**Zero Migration Required**
- Pure additive enhancement
- No breaking changes
- No data migration needed
- No configuration changes required

**User Transition**
1. Update cockpit-apt package via normal APT upgrade
2. Optionally install store definition packages
3. New features appear automatically when stores installed
4. No user training required for basic usage

**Rollback Strategy**
- Uninstall store packages to remove store features
- Downgrade cockpit-apt via APT if needed
- No persistent state to clean up
- System returns to vanilla mode cleanly

## Future Enhancements

### Phase 1.5: AppStream Integration

**Rich Package Metadata**
- Screenshots and application icons
- Multiple language descriptions
- User ratings and review counts
- Age ratings and content warnings

**Implementation Approach**
- Parse AppStream XML from packages
- Extend package data model with optional fields
- Update UI components to display rich metadata
- No architectural changes required

### Phase 2: Advanced Features

**Store Management**
- Enable/disable stores without uninstalling
- User-created custom stores
- Store subscription management
- Import/export store definitions

**Enhanced Filtering**
- Multiple simultaneous store selection
- Advanced search by tags and metadata
- Saved filter presets
- Filter history and suggestions

**Performance Enhancements**
- Background package cache updates
- Incremental filter updates
- More aggressive result caching
- Web worker for filter computation

### Phase 3: Community Features

**User Engagement**
- Package ratings and reviews
- Usage statistics and recommendations
- Featured packages in stores
- Community-contributed store definitions

**Analytics and Insights**
- Popular packages tracking
- Installation trends
- Store usage analytics
- Performance monitoring

## Related Documents

- [SPEC.md](SPEC.md) - Technical specification
- [ADR-001-container-store.md](ADR-001-container-store.md) - Architecture decision record
- [CONTAINER_STORE_DESIGN.md](CONTAINER_STORE_DESIGN.md) - Original design document (historical)
- [CLAUDE.md](../CLAUDE.md) - Development workflow guide
