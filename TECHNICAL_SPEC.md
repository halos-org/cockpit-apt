# Cockpit APT - Technical Specification

**Version:** 1.0
**Date:** 2025-11-06
**Status:** Draft

## Executive Summary

Cockpit APT is a Cockpit module providing native APT package management functionality with direct access to Debian-specific features that PackageKit abstracts away. The primary advantage over PackageKit-based solutions is full access to Debian Section fields, enabling custom categorization schemes (e.g., container/marine, container/media) essential for the Container Store architecture.

## Goals

### Primary Goals

1. **Native APT Access**: Direct integration with APT/dpkg bypassing PackageKit limitations
2. **Debian Section Support**: Full access to Debian Section field for custom categorization
3. **Extensibility**: Configuration-driven views and filters for specialized use cases
4. **Feature Parity**: Match essential functionality of cockpit-package-manager
5. **Performance**: Faster queries than PackageKit (eliminate D-Bus overhead)

### Non-Goals (MVP)

1. Cross-distribution support (Debian/Ubuntu only)
2. Graphical package dependency resolution
3. Repository management UI (use existing tools)

### Future Enhancements (Post-MVP)

1. **AppStream Metadata Integration**: APT repositories can provide AppStream metadata including icons, screenshots, content ratings, and rich descriptions. This will be added as a stretch goal after MVP completion.
2. Advanced dependency visualization
3. Multi-repository configuration UI

## Architecture

### High-Level Architecture

Three-tier architecture with clear separation of concerns:

**Tier 1: Python Backend (cockpit-apt-bridge)**
- Interfaces with python-apt library
- Outputs structured JSON
- Handles complex queries
- Read-only operations

**Tier 2: TypeScript API Layer (apt-wrapper.ts)**
- Wraps Python backend and apt-get commands
- Provides type-safe interface to UI
- Handles error translation
- Manages operation state

**Tier 3: React UI Components**
- PatternFly-based interface
- Consumes TypeScript API
- Handles user interaction
- Manages local state

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Browser (React + PatternFly + TypeScript)              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Search  │  │ Sections │  │ Details  │             │
│  │   View   │  │   View   │  │   View   │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │              │                     │
│       └─────────────┼──────────────┘                    │
│                     │                                    │
│              ┌──────▼──────┐                            │
│              │ apt-wrapper │                            │
│              │    (.ts)    │                            │
│              └──────┬──────┘                            │
└─────────────────────┼────────────────────────────────────┘
                      │ (cockpit.spawn)
┌─────────────────────▼────────────────────────────────────┐
│ Server (Cockpit Bridge)                                  │
│                                                          │
│  ┌─────────────────┐        ┌──────────────────┐       │
│  │  cockpit-apt-bridge  │        │  apt-get/dpkg    │       │
│  │  (python-apt)   │        │  (operations)    │       │
│  │  ↓ JSON output  │        │  ↓ Status-Fd     │       │
│  └────────┬────────┘        └─────────┬────────┘       │
│           │                           │                 │
│           └───────────┬───────────────┘                 │
│                       │                                  │
│                 ┌─────▼─────┐                           │
│                 │  libapt-pkg│                           │
│                 │    dpkg    │                           │
│                 └────────────┘                           │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

**Query Flow (Search, Details, List):**
1. User interaction in React component
2. Component calls apt-wrapper function
3. apt-wrapper calls cockpit.spawn with cockpit-apt-bridge
4. Python script queries python-apt cache
5. Returns JSON to TypeScript
6. TypeScript parses and returns typed data
7. React component updates UI

**Operation Flow (Install, Remove):**
1. User clicks Install/Remove button
2. Component calls apt-wrapper operation function
3. apt-wrapper calls cockpit.spawn with apt-get
4. apt-get executes with Status-Fd for progress
5. Progress updates streamed via callback
6. React component updates progress UI
7. Completion triggers cache refresh

## Data Models

### Core Types

**Package**
- `name`: string - Package name (unique identifier)
- `version`: string - Version string (e.g., "2:8.2-1")
- `architecture`: string - Architecture (amd64, arm64, all)
- `summary`: string - One-line description
- `installed`: boolean - Installation status

**PackageDetails** (extends Package)
- `description`: string - Full multi-paragraph description
- `section`: string - Debian section (e.g., "admin", "container/marine")
- `priority`: string - Priority (optional, standard, important, required)
- `homepage`: string - Upstream homepage URL
- `maintainer`: string - Maintainer name and email
- `size`: number - Download size in bytes
- `installedSize`: number - Installed size in bytes
- `dependencies`: Dependency[] - List of dependencies
- `reverseDependencies`: string[] - Packages depending on this one
- `installedVersion`: string | null - Currently installed version
- `candidateVersion`: string | null - Available version for install

**AppStream Metadata (Optional - Future Enhancement)**
- `appstreamId`: string | null - AppStream component ID
- `icon`: string | null - Icon URL or name
- `screenshots`: Screenshot[] | null - Array of screenshot objects
- `categories`: string[] | null - AppStream categories
- `keywords`: string[] | null - Search keywords
- `developerName`: string | null - Developer/organization name
- `projectLicense`: string | null - License identifier (SPDX)
- `contentRating`: ContentRating | null - Age/content rating
- `releases`: Release[] | null - Version release information

Note: These fields will be null in MVP implementation and populated when AppStream support is added.

**Dependency**
- `name`: string - Package name
- `relation`: string - Relationship operator (<, <=, =, >=, >)
- `version`: string - Version constraint

**Section**
- `name`: string - Section identifier (e.g., "admin", "container/marine")
- `label`: string - Human-readable label
- `description`: string - Section description
- `icon`: string - Icon identifier (FontAwesome or custom)
- `count`: number - Number of packages in section
- `installedCount`: number - Number of installed packages

**OperationProgress**
- `type`: "status" | "download" - Progress type
- `package`: string | null - Package being processed
- `percentage`: number - Progress percentage (0-100)
- `message`: string - Human-readable status message

**APTError**
- `message`: string - Error message
- `code`: string - Error code (PACKAGE_NOT_FOUND, LOCKED, etc.)
- `details`: string | null - Additional error details

### Configuration Schema

**ViewConfiguration**
- `id`: string - Unique view identifier
- `name`: string - Display name
- `enabled`: boolean - Enable/disable view
- `type`: "section-filter" | "custom-query" | "predefined-list"
- `filter`: FilterCriteria - Filtering criteria
- `sort`: SortCriteria - Sorting rules
- `ui`: UICustomization - UI customization options

**FilterCriteria**
- `sections`: string[] | null - Whitelist of sections
- `sectionsExclude`: string[] | null - Blacklist of sections
- `namePattern`: string | null - Regex pattern for package names
- `installed`: boolean | null - Filter by installation status
- `priority`: string[] | null - Filter by priority

**SortCriteria**
- `field`: "name" | "section" | "size" | "installedSize"
- `order`: "asc" | "desc"

**UICustomization**
- `showIcons`: boolean - Display package icons (from AppStream when available)
- `showScreenshots`: boolean - Display screenshots (from AppStream when available)
- `showMetadata`: boolean - Display extended metadata
- `cardLayout`: boolean - Use card layout instead of table
- `featuredPackages`: string[] - Highlighted packages
- `icon`: string | null - Custom icon for view (in navigation menu)

Note: In MVP, `showIcons` and `showScreenshots` will have no effect. These will be implemented when AppStream support is added.

## API Specifications

### Python Backend API (cockpit-apt-bridge)

**Command-Line Interface:**

All commands output JSON to stdout and errors to stderr.

**search QUERY**
- Input: Search query string
- Output: Array of Package objects matching query
- Searches: Package names and summaries
- Limit: 100 results
- Sort: Name matches first, then description matches

**details PACKAGE_NAME**
- Input: Package name
- Output: Single PackageDetails object
- Error: NOT_FOUND if package doesn't exist

**sections**
- Input: None
- Output: Array of Section objects with counts
- Includes: All sections with at least one package
- Sort: Alphabetical by section name

**list-section SECTION_NAME**
- Input: Section name
- Output: Array of Package objects in section
- Sort: Alphabetical by package name

**list-installed**
- Input: None
- Output: Array of Package objects (installed only)
- Sort: Alphabetical by package name

**list-upgradable**
- Input: None
- Output: Array of objects with installedVersion and candidateVersion
- Includes: Only packages with available upgrades

**dependencies PACKAGE_NAME**
- Input: Package name
- Output: Array of Dependency objects
- Includes: Direct dependencies only (not transitive)

**reverse-dependencies PACKAGE_NAME**
- Input: Package name
- Output: Array of package names
- Limit: 50 results
- Includes: Direct reverse dependencies

**Exit Codes:**
- 0: Success
- 1: General error
- 2: Package not found
- 3: Invalid input

### TypeScript API (apt-wrapper.ts)

**Query Functions:**

**searchPackages(query: string): Promise<Package[]>**
- Minimum query length: 2 characters
- Throws: APTError on failure
- Cache: Results not cached (always fresh)

**getPackageDetails(name: string): Promise<PackageDetails>**
- Throws: APTError with code PACKAGE_NOT_FOUND if not found
- Cache: Results cached for 60 seconds

**listSections(): Promise<Section[]>**
- Cache: Results cached for 5 minutes
- Includes: Only sections with displayable packages

**listPackagesBySection(section: string): Promise<Package[]>**
- Cache: Results cached for 60 seconds per section
- Empty section returns empty array (not error)

**listInstalled(): Promise<Package[]>**
- Cache: Results cached for 30 seconds
- Invalidate: On install/remove operations

**listUpgradable(): Promise<UpgradablePackage[]>**
- Cache: Results cached for 60 seconds
- Includes: installedVersion and candidateVersion

**isInstalled(name: string): Promise<boolean>**
- Fast check using dpkg-query
- No caching (always current)
- Returns: false if package doesn't exist

**Operation Functions:**

**installPackage(name: string, onProgress?: ProgressCallback): Promise<void>**
- Requires: superuser privileges
- Progress: Real-time updates via callback
- Throws: APTError on failure
- Options: force-confdef, force-confold (keep existing configs)

**removePackage(name: string, onProgress?: ProgressCallback): Promise<void>**
- Requires: superuser privileges
- Progress: Real-time updates via callback
- Throws: APTError on failure
- Does not: Auto-remove dependencies (use purge for that)

**updatePackageLists(onProgress?: ProgressCallback): Promise<void>**
- Requires: superuser privileges
- Progress: Callback called with indeterminate progress
- Invalidates: All caches after completion

**Utility Functions:**

**isLocked(): Promise<boolean>**
- Checks: /var/lib/dpkg/lock-frontend
- No privilege required

**waitForLock(timeoutMs?: number): Promise<void>**
- Default timeout: 60000ms (60 seconds)
- Polls: Every 2 seconds
- Throws: APTError with code LOCK_TIMEOUT on timeout

**clearCache(): void**
- Clears: All cached query results
- Use: After external package changes

## Configuration System

### Configuration File Location

Primary: `/etc/cockpit/apt/views.d/*.json`
User override: `~/.config/cockpit/apt/views.json` (future)
Built-in: `/usr/share/cockpit/apt/views/default.json`

### Loading Priority

1. Built-in default configuration (always loaded)
2. System configurations from `/etc/cockpit/apt/views.d/` (alphabetical)
3. User configuration (overrides system)

### Configuration Format

Each configuration file defines one or more views:

**File Structure:**
- Root object with `views` array
- Each view is a ViewConfiguration object
- Validation on load (invalid configs logged, not loaded)

**View Types:**

**section-filter**
- Purpose: Filter packages by Debian section
- Use case: Container Store (show only container/* sections)
- Parameters: sections (whitelist), sectionsExclude (blacklist)

**custom-query**
- Purpose: Complex filtering logic
- Use case: "Development Tools" (multiple sections + name patterns)
- Parameters: namePattern, sections, installed, priority

**predefined-list**
- Purpose: Curated list of specific packages
- Use case: "Featured Apps", "Recommended Tools"
- Parameters: packages (array of package names)

### Example Configurations

**Container Store View:**
- ID: "container-store"
- Type: section-filter
- Sections: ["container/media", "container/marine", "container/productivity"]
- UI: Card layout, show icons, show screenshots
- Featured: ["container-signalk", "container-jellyfin"]

**System Administration View:**
- ID: "system-admin"
- Type: section-filter
- Sections: ["admin", "utils"]
- UI: Table layout, no icons

**Installed Packages View:**
- ID: "installed"
- Type: custom-query
- Filter: installed = true
- Sort: name ascending

### Configuration Validation

**Required Fields:**
- id (unique, alphanumeric + dash)
- name (non-empty string)
- type (valid enum value)
- enabled (boolean)

**Constraints:**
- At least one filter criterion must be specified
- Section names must not contain spaces
- Name patterns must be valid regex
- Featured packages must exist in filtered results

**Error Handling:**
- Invalid config files logged to console
- Invalid views skipped (application continues)
- Validation errors shown in UI (admin mode)

## User Interface Design

### Navigation Structure

**Top-level Navigation:**
- All Packages (default view)
- Sections (browse by Debian section)
- Installed (installed packages only)
- Updates (packages with available upgrades)
- Custom Views (from configuration)

**Breadcrumb Navigation:**
- Level 1: View name (e.g., "Sections")
- Level 2: Category (e.g., "container/marine")
- Level 3: Package details (e.g., "container-signalk")

### View Layouts

**All Packages View:**
- Search bar (2+ characters, auto-search at 4+)
- Results table: Name | Version | Section | Status
- Actions: Install/Remove buttons
- Pagination: 50 items per page

**Sections View:**
- Grid of section cards
- Each card: Icon, name, package count, installed count
- Click: Navigate to section package list
- Sort: Alphabetical, by package count, by installed count

**Section Package List:**
- Breadcrumb: Sections > {section name}
- Filter: All / Installed / Not Installed
- Table: Name | Version | Summary | Status
- Actions: Install/Remove buttons
- Back navigation: ESC key or breadcrumb

**Package Details View:**
- Header: Name, version, installation status
- Tabs: Overview, Dependencies, Files
- Overview: Description, metadata, screenshots (if configured)
- Dependencies: List with install status indicators
- Files: Installed files list (if installed)
- Actions: Install/Remove, Open Homepage

**Installed Packages View:**
- Table: Name | Version | Section | Size
- Filter: By section (dropdown)
- Search: Filter by name
- Bulk actions: Remove selected (future)

**Updates View:**
- Table: Name | Installed Version | Available Version | Size
- Actions: Update, Update All
- Progress: Global progress bar for bulk updates

**Custom Views:**
- Layout determined by configuration (table or card)
- Filtering applied automatically
- Actions: Same as other views
- Customization: Icons, screenshots per config

### UI Components

**SearchBar Component:**
- Debounced input (300ms)
- Clear button
- Loading indicator
- Min length indicator (shows "Type 2+ characters")

**PackageTable Component:**
- Sortable columns
- Selectable rows
- Action buttons per row
- Loading skeleton
- Empty state

**PackageCard Component:**
- Icon (if configured)
- Name and summary
- Version badge
- Install/Remove button
- Click: Navigate to details

**SectionCard Component:**
- Icon (from config or default)
- Section name
- Package counts
- Click: Navigate to section list

**PackageDetails Component:**
- Tabbed interface
- Rich description rendering (Markdown)
- Dependency graph (simple list with status)
- File list with search
- Action buttons (sticky header)

**ProgressModal Component:**
- Modal overlay (blocking)
- Progress bar (percentage)
- Current action description
- Package name
- Cancel button (if cancellable)

**ErrorAlert Component:**
- Dismissible alert
- Error code badge
- Error message
- Details (collapsible)
- Retry action (if applicable)

### Accessibility

**Keyboard Navigation:**
- Tab order: Logical flow
- Enter: Activate buttons/links
- Escape: Close modals, go back
- Arrow keys: Navigate lists/tables
- Ctrl+F: Focus search

**Screen Reader Support:**
- ARIA labels on all interactive elements
- Live regions for dynamic updates
- Table headers properly associated
- Progress announcements

**Visual:**
- High contrast mode support
- Focus indicators (visible outline)
- Icon + text labels (not icon-only)
- Consistent color coding

### Responsive Design

**Desktop (>1200px):**
- Full navigation sidebar
- Multi-column layouts
- Card grid: 4 columns

**Tablet (768px-1200px):**
- Collapsed navigation (hamburger)
- Reduced columns
- Card grid: 2-3 columns

**Mobile (<768px):**
- Single column layout
- Simplified tables (stacked)
- Card grid: 1 column
- Touch-friendly buttons (44px min)

## Security Model

### Privilege Separation

**Read-Only Operations (No Privileges Required):**
- Search packages
- Get package details
- List sections
- List installed packages
- Check installation status

**Write Operations (Require Root):**
- Install packages
- Remove packages
- Update package lists

### Privilege Escalation

**Method:**
- Use Cockpit's built-in superuser mode
- cockpit.spawn with `{ superuser: "require" }`
- Leverages polkit for authorization

**User Prompts:**
- First privileged operation: Password prompt
- Session duration: Configurable in Cockpit (default: 5 minutes)
- Explicit actions only: No background operations

**Polkit Integration:**
- Use existing org.debian.apt polkit policies
- No custom polkit rules required
- Respects system-wide authorization settings

### Lock Handling

**APT Lock Detection:**
- Check /var/lib/dpkg/lock-frontend before operations
- Display "Another package manager is running" if locked
- Option to wait (with timeout) or cancel

**Concurrent Operations:**
- Only one operation at a time within cockpit-apt
- Queue subsequent operations (not parallel)
- Clear indication of queue status

**Lock Timeout:**
- Default: 60 seconds wait for lock
- Configurable in settings (future)
- User can cancel wait at any time

### Input Validation

**Package Names:**
- Allowed characters: a-z, 0-9, +, -, .
- Max length: 255 characters
- Reject: Shell metacharacters, path separators

**Section Names:**
- Allowed characters: a-z, 0-9, -, /, _
- Max length: 100 characters
- Validate against known sections

**Search Queries:**
- Max length: 500 characters
- Sanitize: Escape regex special characters
- No SQL/command injection risk (not passed to shell)

### Error Handling

**User-Facing Errors:**
- Clear, non-technical language
- Actionable suggestions (e.g., "Close Update Manager")
- No stack traces or technical details

**Logging:**
- Errors logged to browser console (development)
- Sensitive information not logged
- cockpit.spawn errors captured and translated

**Sensitive Operations:**
- Confirm before: Remove essential packages
- Warn: Removing packages with reverse dependencies
- Prevent: Removing dpkg, apt, libc6

## Performance Considerations

### Caching Strategy

**Cache Scope:**
- Per-session (browser tab lifetime)
- In-memory only (no persistent cache)

**Cache Keys:**
- Package details: package name
- Section list: "sections"
- Section packages: section name
- Installed list: "installed"

**Cache TTL:**
- Package details: 60 seconds
- Section list: 5 minutes
- Section packages: 60 seconds
- Installed list: 30 seconds
- Search results: Not cached (always fresh)

**Cache Invalidation:**
- On install/remove: Clear installed list, affected package details
- On update: Clear all caches
- Manual: clearCache() function

### Lazy Loading

**Initial Load:**
- Section list only (fast)
- Package lists loaded on demand (per section)
- Details loaded on demand (per package)

**Pagination:**
- Search results: 50 per page
- Package lists: 100 per page
- Load next page on scroll or button click

**Image Loading:**
- Icons: Lazy load (IntersectionObserver)
- Screenshots: Lazy load with placeholder
- Defer: Off-screen images

### Python-apt Performance

**Cache Loading:**
- First call: 1-3 seconds (unavoidable)
- Keep-alive: Consider daemon mode (future optimization)
- Current: Fork per request (simpler, adequate for UI)

**Query Optimization:**
- Filter in Python (not in TypeScript)
- Limit results early
- Avoid iterating entire cache when possible

**Memory:**
- Python process: ~50-100MB per invocation
- Short-lived: Exits after response
- No memory leak concerns

### Network Considerations

**Bandwidth:**
- JSON responses: Typically <100KB
- No images served by backend
- Minimal data transfer

**Latency:**
- Local execution: <100ms (dpkg-query)
- Python-apt: 100-500ms (after cache load)
- apt-get operations: Variable (download-dependent)

**Offline Operation:**
- Read operations: Work offline (use local cache)
- Install: Fails if packages not in local cache
- Search: Works offline (local cache only)

## Error Scenarios

### Package Not Found

**Cause:** User searches for or tries to install non-existent package
**Handling:** Show "Package not found" with suggestion to check spelling
**Recovery:** User corrects spelling or searches differently

### Lock Held

**Cause:** Another package manager (apt, synaptic) is running
**Handling:** Show "Package manager is locked" with waiting option
**Recovery:** Wait for lock release (auto-retry) or cancel

### Permission Denied

**Cause:** User lacks sudo privileges
**Handling:** Show "Administrative privileges required"
**Recovery:** Prompt for password via Cockpit's superuser mode

### Network Failure (Update)

**Cause:** No internet connection during package list update
**Handling:** Show "Failed to download package lists" with details
**Recovery:** User checks connection and retries

### Disk Space

**Cause:** Insufficient disk space for installation
**Handling:** Show "Insufficient disk space" with required/available
**Recovery:** User frees space and retries

### Broken Dependencies

**Cause:** Package has unmet dependencies
**Handling:** Show "Cannot install due to unmet dependencies" with list
**Recovery:** User installs dependencies first (show in UI)

### Configuration File Conflict

**Cause:** Updated package has modified config file
**Handling:** apt-get configured to keep existing configs (force-confold)
**Recovery:** Automatic (keeps user's version)

### Python-apt Failure

**Cause:** python-apt not installed or import fails
**Handling:** Show "APT backend not available" with install instructions
**Recovery:** Install python3-apt package

### Invalid Configuration

**Cause:** Malformed JSON in views.d/
**Handling:** Log error, skip invalid config, continue with valid ones
**Recovery:** Administrator fixes JSON syntax

## Browser Compatibility

**Supported Browsers:**
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+ (macOS)
- Edge 90+

**Required Features:**
- ES2020 support
- WebSocket (for Cockpit bridge)
- Promises and async/await
- Fetch API
- IntersectionObserver (lazy loading)

**Not Required:**
- Service Workers
- WebRTC
- WebGL

## Deployment

### Package Structure

**Package Name:** cockpit-apt
**Architecture:** all (JavaScript/Python, no compiled code)
**Dependencies:**
- cockpit (>= 276)
- python3-apt
- apt (installed on all Debian/Ubuntu systems)

**Installed Files:**
- /usr/share/cockpit/apt/ - UI files (HTML, JS, CSS)
- /usr/share/cockpit/apt/cockpit-apt-bridge - Python backend
- /usr/share/cockpit/apt/views/default.json - Default configuration
- /etc/cockpit/apt/views.d/ - Configuration directory (empty)

### Installation

Standard Debian package installation:
- dpkg -i cockpit-apt_*.deb
- apt install cockpit-apt

Post-installation:
- No daemon to start
- No configuration required (works out of box)
- Optional: Add custom views to /etc/cockpit/apt/views.d/

### Upgrades

**Configuration Preservation:**
- /etc/cockpit/apt/ marked as conffiles
- User customizations preserved
- Default view updated if not customized

**Cache Handling:**
- In-memory cache cleared on reload
- No persistent cache to migrate

**Breaking Changes:**
- Major version bumps indicate API changes
- Configuration schema versioned
- Migration path documented in changelog

## Future Enhancements

**Phase 1.5 (AppStream Integration - High Priority Post-MVP):**

Modern APT repositories can provide AppStream metadata that significantly enhances the package browsing experience. This integration should be added soon after MVP completion.

**AppStream Data Sources:**
- XML metadata in `/var/lib/app-info/xmls/` (downloaded via `apt update`)
- YAML metadata in `/usr/share/app-info/yaml/`
- Desktop files in `/usr/share/applications/`

**Implementation Approach:**
- Add `appstream-parser.py` module using `python3-gi` and `AppStreamGlib`
- Extend `PackageDetails` interface with optional AppStream fields (already designed)
- Update `details` command to merge APT + AppStream data
- Graceful degradation: Show APT data if AppStream unavailable

**Enhanced Features:**
- **Rich Metadata**: Icons, screenshots, content ratings, developer info
- **Improved Search**: Search AppStream keywords and categories
- **Better Categorization**: Use AppStream categories alongside Debian sections
- **Screenshots**: Display in PackageDetails view
- **Release Notes**: Show changelog from AppStream releases

**UI Changes:**
- PackageCard: Show AppStream icon if available
- PackageDetails: Screenshots carousel, content rating badges
- SearchView: Filter by AppStream categories
- Configuration: Support AppStream category filters

**Testing Requirements:**
- Test with packages that have AppStream metadata
- Test graceful degradation when AppStream data missing
- Test with repositories that don't provide AppStream
- Validate XML/YAML parsing with malformed data

**Estimated Effort:** 1-2 weeks after MVP completion

**Phase 2 (Additional Features):**
- Bulk operations (install/remove multiple packages)
- Package pinning UI
- Repository management
- Update notifications integration
- Search filters (by section, size, date)

**Phase 3 (Advanced):**
- Daemon mode for python-apt (keep cache loaded)
- Package comparison
- Dependency graph visualization
- Local .deb file installation
- Configuration file diff viewer

**Phase 4 (Integration):**
- Container Store integration (pre-configured view)
- Integration with cockpit-containermanager
- System state snapshots (before major changes)
- Automated testing integration

## Appendix

### Glossary

**APT:** Advanced Package Tool, Debian's package manager
**AppStream:** Cross-distribution metadata standard for software components (icons, screenshots, categories)
**dpkg:** Debian package manager (low-level)
**python-apt:** Python interface to libapt-pkg
**Section:** Debian package classification (e.g., admin, net)
**Status-Fd:** APT option for machine-readable progress output
**Superuser Mode:** Cockpit's privilege escalation mechanism
**View:** Configurable package list/filter in UI

### References

- Cockpit Developer Guide: https://cockpit-project.org/guide/latest/
- python-apt Documentation: https://apt-team.pages.debian.net/python-apt/
- APT User's Guide: https://www.debian.org/doc/manuals/apt-guide/
- Debian Policy Manual: https://www.debian.org/doc/debian-policy/
- PatternFly Design System: https://www.patternfly.org/

### Revision History

- v1.0 (2025-11-06): Initial specification
