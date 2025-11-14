# Technical Specification: Container Store Filtering

**Status**: Draft
**Date**: 2025-11-14
**Component**: cockpit-apt

## Project Overview

This specification defines the container store filtering and repository management features for cockpit-apt. These enhancements enable cockpit-apt to present curated "stores" of container applications while maintaining full functionality as a general-purpose APT package manager.

The goal is to transform cockpit-apt from a vanilla APT package manager into an extensible application platform that can present specialized package collections through filtered "store" views, while preserving its core functionality for system package management.

## Goals

### Primary Goals

1. **Enable Curated Package Stores**: Allow creation of specialized package collections (marine apps, dev tools, etc.) that filter and present relevant packages
2. **Repository Filtering**: Provide user-visible repository filtering to identify package sources and control which repositories are displayed
3. **Maintain Vanilla Compatibility**: Continue working as a standard APT manager when no store packages are installed
4. **Progressive Enhancement**: Store features appear only when relevant store definition packages are installed
5. **Upstream Friendly**: Design with potential inclusion in Debian/Ubuntu in mind

### Secondary Goals

1. Support multiple concurrent stores
2. Enable custom section definitions beyond standard Debian sections
3. Provide consistent UX across store and system package views
4. Maintain performance with large package lists

## Core Features

### 1. Store Toggle Group

**Purpose**: Switch between "System" (all packages) and specialized store views (filtered packages).

**User Experience**:
- Hidden when no store packages are installed (vanilla mode)
- Appears as a single row of toggle buttons when 1+ stores installed
- Options: "System" + installed store names (alphabetical)
- Single selection with radio button behavior
- Selection persists across sessions

**Requirements**:
- MUST be hidden when no stores installed
- MUST show all installed stores alphabetically
- MUST persist selection in browser localStorage
- MUST default to "System" on first visit
- MUST trigger package list refresh on selection change

### 2. Repository Dropdown

**Purpose**: Filter packages by repository origin, useful for identifying sources and troubleshooting.

**User Experience**:
- Always present (even without stores)
- Hidden if only 1 repository configured
- Shows "All" + repository names from APT Release files
- Context-sensitive: filtered by active store when store selected
- Selection persists across sessions

**Requirements**:
- MUST be visible in vanilla mode (no stores)
- MUST hide when only 1 repository available
- MUST show repository names from Origin or Label fields
- MUST filter repository list by active store context
- MUST persist selection in browser localStorage
- MUST trigger package list refresh on selection change

### 3. Store Definition Packages

**Purpose**: Define which packages belong to a store and provide custom metadata.

**Package Format**:
- Package naming: `<store-id>-container-store` (e.g., `marine-container-store`)
- Installs configuration to `/etc/container-apps/stores/<store-id>.yaml`
- Installs branding assets to `/usr/share/container-stores/<store-id>/`

**Configuration Format** (YAML):
```yaml
id: marine
name: Marine Navigation & Monitoring
description: |
  Applications for marine navigation, monitoring, and boat systems.

icon: /usr/share/container-stores/marine/icon.svg
banner: /usr/share/container-stores/marine/banner.png

filters:
  include_origins:      # All packages from specific origin
    - "Hat Labs"
  include_sections:     # Packages from specific sections
    - net
    - web
  include_tags:         # Packages with specific debtags
    - field::marine
  include_packages:     # Explicitly included packages
    - influxdb-container

section_metadata:
  net:
    label: Navigation & Communication
    icon: anchor
    description: Marine networking services
```

**Requirements**:
- Store config MUST be valid YAML
- All filters are optional (at least one must be specified)
- Filter logic: OR within categories, AND between categories
- Custom section metadata overrides standard Debian sections
- Store packages MUST be uninstallable via APT

### 4. Debtag-Based Filtering

**Purpose**: Use Debian's faceted tag system for rich package categorization.

**Tag Format**: Faceted tags with syntax `facet::value`

**Common Facets**:
- `role::container-app` - Identifies as a container application
- `field::marine` - Application domain
- `interface::web` - Has web interface
- `use::monitoring` - Primary purpose
- `network::server` - Network role

**Requirements**:
- MUST parse `Tag:` field from package metadata
- MUST support multiple tags per package
- MUST use OR logic for tag matching (any matching tag qualifies)
- MUST handle missing Tag field gracefully

### 5. Origin/Label-Based Filtering

**Purpose**: Filter packages by APT repository origin for source identification.

**Data Source**: APT Release files (`/var/lib/apt/lists/*_Release`)

**Relevant Fields**:
- `Origin:` - Organization maintaining repository (preferred)
- `Label:` - Human-readable repository name (fallback)
- `Suite:` - Distribution release

**Requirements**:
- MUST parse Origin and Label from Release files
- MUST prefer Origin over Label for display names
- MUST associate packages with their origin
- MUST handle packages without origin gracefully

## Filter Cascade Logic

**Hierarchy**:
1. Store selection determines eligible packages
2. Repository dropdown filters within eligible set
3. Tab selection (Browse/Search/Installed/Updates) filters within that set
4. Content area displays final filtered results

**Filter Application Order**:
```
All Packages
  → Store Filter (if active)
    → Repository Filter (if active)
      → Tab Filter (installed/updates/search)
        → Display Results
```

**Requirements**:
- Filters MUST be applied in order: store → repository → tab
- Each filter MUST operate on the output of the previous filter
- Filter state MUST persist across page refreshes
- Filter changes MUST trigger package list refresh

## Technical Requirements

### Backend Requirements

1. **Store Configuration Loading**
   - Load from `/etc/container-apps/stores/*.yaml`
   - Validate against schema
   - Cache in memory for performance
   - Provide JSON output for frontend

2. **Debtag Parsing**
   - Extract `Tag:` field from python-apt Package objects
   - Parse comma-separated tag lists
   - Handle missing tags gracefully

3. **Origin/Label Parsing**
   - Parse Release files from APT lists directory
   - Extract Origin and Label fields
   - Associate packages with origins via python-apt

4. **Filter Matching Logic**
   - Implement OR logic within filter categories
   - Implement AND logic between categories
   - Optimize for performance with large package lists

5. **Command Interface**
   - Extend existing JSON command interface
   - Add commands: `stores list`, `repositories list`, `packages filter`
   - Maintain backward compatibility

### Frontend Requirements

1. **Store Toggle Component**
   - PatternFly ToggleGroup component
   - Conditional rendering based on store availability
   - State management with React hooks

2. **Repository Dropdown Component**
   - PatternFly Dropdown component
   - Always present (hidden if ≤1 repo)
   - Dynamic filtering based on active store

3. **State Management**
   - Use React Context for global filter state
   - Persist state in localStorage
   - Handle concurrent state updates

4. **Filter Integration**
   - Integrate with existing package list components
   - Maintain existing tab functionality
   - Support existing search functionality

5. **Performance Optimization**
   - Memoize filter operations
   - Debounce search queries (300ms)
   - Virtual scrolling for large lists

## Non-Functional Requirements

### Performance

- Package list filtering MUST complete in <100ms for 10,000 packages
- Store config loading MUST complete in <50ms
- UI interactions MUST feel instant (<16ms response time)
- Virtual scrolling MUST handle lists of 10,000+ packages

### Compatibility

- MUST work on Debian 12 (Bookworm) and Ubuntu 22.04+
- MUST work with Python 3.11+
- MUST work with existing Cockpit installations
- MUST maintain backward compatibility with vanilla cockpit-apt usage

### Usability

- Store toggle MUST be visually distinct but not intrusive
- Repository dropdown MUST be discoverable but not prominent
- Filter state MUST be obvious to users
- Clear visual feedback when filters are active

### Maintainability

- Store configs MUST be human-readable YAML
- Configuration schema MUST be documented
- Error messages MUST be actionable
- Code MUST follow existing project patterns

## Out of Scope

### Explicitly Not Included

1. **AppStream Metadata Integration**: Rich package details (screenshots, ratings) - deferred to Phase 1.5
2. **Container Management**: Starting/stopping containers - separate cockpit-container-config module
3. **Package Installation/Removal**: Core APT functionality - already implemented
4. **User Reviews/Ratings**: Community features - future enhancement
5. **Multi-Language Support**: i18n - future enhancement
6. **Store Analytics**: Usage tracking - future enhancement
7. **Store Creation Tools**: Wizard for creating stores - future enhancement

### Technical Limitations

1. **Single Store Selection**: Cannot activate multiple stores simultaneously
2. **Static Store Configs**: No runtime modification of store definitions
3. **No Store Subscriptions**: Cannot disable installed stores without uninstalling
4. **Docker Compose Only**: Container apps use Docker Compose, not Podman pods

## Constraints and Assumptions

### Constraints

1. Must use existing python-apt API (no direct APT command execution)
2. Must use PatternFly components for UI consistency
3. Must integrate with existing cockpit-apt architecture
4. Must not modify APT repositories or package metadata
5. Must not break vanilla APT package management

### Assumptions

1. Store definition packages are installed via APT
2. Debtags are present in package metadata
3. Release files contain Origin/Label fields
4. Users understand concept of repositories
5. Cockpit is the primary admin interface
6. Target deployment is HaLOS on Raspberry Pi

## Success Criteria

### Must Have (MVP)

- [ ] Store toggle appears when store packages installed
- [ ] Store toggle filters packages correctly
- [ ] Repository dropdown shows all configured repositories
- [ ] Repository dropdown filters packages correctly
- [ ] Filters cascade correctly (store → repo → tab)
- [ ] Filter state persists across sessions
- [ ] Vanilla mode works without stores installed
- [ ] All existing functionality continues to work

### Should Have (Phase 1)

- [ ] 3-5 marine container apps available
- [ ] Custom section metadata displays correctly
- [ ] Performance acceptable with 1000+ packages
- [ ] Error handling for invalid store configs
- [ ] Documentation complete

### Could Have (Future)

- [ ] Store branding (icons, banners) in UI
- [ ] Advanced search by tags
- [ ] Store subscription management
- [ ] Multiple store selection

## Related Documents

- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed system architecture
- [ADR-001-container-store.md](ADR-001-container-store.md) - Architecture decision record
- [CONTAINER_STORE_DESIGN.md](CONTAINER_STORE_DESIGN.md) - Original design document (historical reference)
