# Cockpit APT - Project Plan

**Version:** 1.0
**Date:** 2025-11-06

## Overview

This document outlines the project structure, module responsibilities, development phases, and implementation guidelines for cockpit-apt.

## Testing Strategy

**CRITICAL: Every task must include a thorough test suite built side-by-side with implementation.**

Each implementation task requires:
- Unit tests for all functions and components
- Integration tests for multi-module interactions
- Manual test scenarios for UI validation
- Error case coverage
- Performance validation where applicable

Tests must be written and passing before the task is considered complete.

## Project Structure

### Directory Tree

cockpit-apt/
├── backend/                           # Python backend
│   ├── pyproject.toml                # uv project configuration
│   ├── .python-version               # Python version for uv
│   ├── ruff.toml                     # Ruff linter configuration
│   ├── pyrightconfig.json            # Pyright type checker configuration
│   ├── cockpit_apt_bridge/           # Python package
│   │   ├── __init__.py
│   │   ├── __main__.py               # CLI entry point (python -m cockpit_apt_bridge)
│   │   ├── cli.py                    # Main CLI logic and argument parsing
│   │   ├── commands/                 # Command implementations
│   │   │   ├── __init__.py
│   │   │   ├── search.py
│   │   │   ├── details.py
│   │   │   ├── sections.py
│   │   │   ├── list_section.py
│   │   │   ├── list_installed.py
│   │   │   ├── list_upgradable.py
│   │   │   ├── dependencies.py
│   │   │   └── reverse_dependencies.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── apt_cache.py          # APT cache wrapper
│   │       ├── formatters.py         # JSON output formatting
│   │       └── errors.py             # Error classes and handling
│   └── tests/
│       ├── __init__.py
│       ├── test_search.py
│       ├── test_details.py
│       ├── test_sections.py
│       ├── test_list_operations.py
│       └── fixtures/
│           ├── mock_cache.py
│           └── sample_packages.json
├── frontend/                          # TypeScript/React frontend
│   ├── src/
│   │   ├── lib/
│   │   │   ├── apt-wrapper.ts
│   │   │   ├── types.ts
│   │   │   ├── config-loader.ts
│   │   │   ├── cache-manager.ts
│   │   │   └── error-handler.ts
│   │   ├── components/
│   │   │   ├── SearchView.tsx
│   │   │   ├── SectionsView.tsx
│   │   │   ├── SectionPackageList.tsx
│   │   │   ├── PackageDetails.tsx
│   │   │   ├── InstalledView.tsx
│   │   │   ├── UpdatesView.tsx
│   │   │   ├── CustomView.tsx
│   │   │   ├── common/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── PackageTable.tsx
│   │   │   │   ├── PackageCard.tsx
│   │   │   │   ├── SectionCard.tsx
│   │   │   │   ├── ProgressModal.tsx
│   │   │   │   ├── ErrorAlert.tsx
│   │   │   │   └── LoadingSkeleton.tsx
│   │   │   └── PackageDetailsTab.tsx
│   │   ├── hooks/
│   │   │   ├── usePackageQuery.ts
│   │   │   ├── usePackageOperation.ts
│   │   │   ├── useConfig.ts
│   │   │   └── useCache.ts
│   │   ├── utils/
│   │   │   ├── formatting.ts
│   │   │   ├── validation.ts
│   │   │   └── constants.ts
│   │   ├── apt.tsx
│   │   ├── index.html
│   │   └── manifest.json
│   ├── test/
│   │   ├── unit/
│   │   │   ├── apt-wrapper.test.ts
│   │   │   ├── config-loader.test.ts
│   │   │   ├── cache-manager.test.ts
│   │   │   └── error-handler.test.ts
│   │   ├── integration/
│   │   │   ├── search-flow.test.ts
│   │   │   ├── install-flow.test.ts
│   │   │   ├── config-loading.test.ts
│   │   │   └── cache-behavior.test.ts
│   │   ├── e2e/
│   │   │   ├── search.spec.ts
│   │   │   ├── install-remove.spec.ts
│   │   │   ├── sections-navigation.spec.ts
│   │   │   └── updates.spec.ts
│   │   └── fixtures/
│   │       ├── mock-packages.json
│   │       ├── mock-sections.json
│   │       └── test-config.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── esbuild.config.js
│   ├── .eslintrc.json
│   └── .prettierrc
├── views/                             # Configuration files
│   ├── default.json
│   └── examples/
│       ├── container-store.json
│       └── system-admin.json
├── debian/                            # Debian packaging
│   ├── control
│   ├── rules
│   ├── changelog
│   ├── copyright
│   ├── install
│   ├── postinst
│   └── cockpit-apt.dirs
├── .gitignore
├── README.md
├── CONTRIBUTING.md
├── TECHNICAL_SPEC.md
├── PROJECT_PLAN.md
├── STATE.md
├── TASK_01_INFRASTRUCTURE.md
├── TASK_02_PYTHON_BACKEND.md
├── TASK_03_TYPESCRIPT_WRAPPER.md
├── TASK_04_UI_COMPONENTS.md
├── TASK_05_CONFIGURATION.md
└── TASK_06_OPERATIONS.md

### File Responsibilities

#### Backend (Python)

**backend/pyproject.toml**
- Project metadata and dependencies (managed by uv)
- Python version specification
- Development dependencies (pytest, ruff, pyright)
- Build system configuration
- Entry point: `cockpit-apt-bridge` command

**backend/cockpit_apt_bridge/cli.py**
- Main CLI entry point
- Argument parsing
- Command dispatch
- Top-level error handling
- JSON output coordination

**backend/cockpit_apt_bridge/commands/*.py**
- Individual command implementations (search, details, etc.)
- Each command is a separate module
- Command-specific logic and APT cache queries
- Returns structured data to CLI for JSON serialization

**backend/cockpit_apt_bridge/utils/apt_cache.py**
- Wrapper around python-apt Cache
- Shared cache management
- Common APT query utilities

**backend/cockpit_apt_bridge/utils/formatters.py**
- JSON output formatting
- Data serialization utilities
- Type conversion helpers

**backend/cockpit_apt_bridge/utils/errors.py**
- Custom exception classes
- Error code definitions
- Error JSON formatting

#### Frontend (TypeScript/React)

**frontend/src/lib/apt-wrapper.ts**
- TypeScript API layer wrapping cockpit-apt-bridge and apt-get
- Type-safe interface for UI consumption
- Progress callback handling
- Error translation to APTError types
- Cache coordination

**frontend/src/lib/types.ts**
- TypeScript type definitions for all data structures
- Interfaces for Package, PackageDetails, Section, etc.
- Error types
- Configuration types
- No implementation, only declarations

**frontend/src/lib/config-loader.ts**
- Loads and validates view configurations
- Merges built-in, system, and user configs
- Configuration schema validation
- Error logging for invalid configs

**frontend/src/lib/cache-manager.ts**
- In-memory cache implementation
- TTL management
- Cache invalidation logic
- Cache key generation

**frontend/src/lib/error-handler.ts**
- Centralized error handling
- APT error code to user message translation
- Error logging
- Retry logic determination

**frontend/src/components/SearchView.tsx**
- Search interface component
- Debounced search input
- Results table
- Install/remove actions from search results

**frontend/src/components/SectionsView.tsx**
- Section browsing interface
- Grid of section cards
- Section statistics (count, installed count)
- Navigation to section package lists

**frontend/src/components/SectionPackageList.tsx**
- Package list for specific section
- Filtering (all/installed/not installed)
- Breadcrumb navigation
- Install/remove actions

**frontend/src/components/PackageDetails.tsx**
- Detailed package information display
- Tabbed interface (overview, dependencies, files)
- Rich description rendering
- Primary install/remove actions

**frontend/src/components/InstalledView.tsx**
- List of all installed packages
- Section filter dropdown
- Name search
- Bulk selection (future)

**frontend/src/components/UpdatesView.tsx**
- List of packages with available updates
- Show current and available versions
- Update actions (single and bulk)
- Global progress for bulk updates

**frontend/src/components/CustomView.tsx**
- Configurable view component
- Renders based on view configuration
- Applies filters from config
- Uses configured layout (table/card)

**frontend/src/components/common/SearchBar.tsx**
- Reusable search input component
- Debouncing logic
- Clear button
- Loading indicator

**frontend/src/components/common/PackageTable.tsx**
- Reusable package table component
- Sortable columns
- Selectable rows
- Action buttons per row
- Empty state handling

**frontend/src/components/common/PackageCard.tsx**
- Card display for single package
- Icon support
- Install/remove button
- Click navigation to details

**frontend/src/components/common/SectionCard.tsx**
- Card display for section
- Icon from configuration
- Package counts
- Click navigation to section list

**frontend/src/components/common/ProgressModal.tsx**
- Modal for operation progress
- Progress bar with percentage
- Cancel button (if operation supports it)
- Blocks UI during operation

**frontend/src/components/common/ErrorAlert.tsx**
- Dismissible error display
- Error code badge
- Collapsible details
- Retry button where applicable

**frontend/src/components/common/LoadingSkeleton.tsx**
- Skeleton screens for loading states
- Table skeleton
- Card skeleton
- Details skeleton

**frontend/src/hooks/usePackageQuery.ts**
- Custom hook for package queries
- Loading state management
- Error handling
- Cache integration

**frontend/src/hooks/usePackageOperation.ts**
- Custom hook for install/remove operations
- Progress state management
- Error handling
- Cache invalidation on success

**frontend/src/hooks/useConfig.ts**
- Custom hook for configuration access
- Loads configurations on mount
- Provides view definitions
- Reloads on configuration change

**frontend/src/hooks/useCache.ts**
- Custom hook for cache access
- Provides cached data
- Handles cache invalidation
- TTL checking

**frontend/src/utils/formatting.ts**
- Utility functions for data formatting
- Byte size formatting
- Date formatting
- Version string parsing

**frontend/src/utils/validation.ts**
- Input validation functions
- Package name validation
- Section name validation
- Configuration validation schemas

**frontend/src/utils/constants.ts**
- Application constants
- Cache TTL values
- UI configuration
- Error codes

**frontend/src/apt.tsx**
- Root React component
- Routing logic
- Layout structure
- Context providers (cache, config)

**frontend/src/index.html**
- HTML entry point
- Loads cockpit.js
- Loads bundled JavaScript
- Minimal markup (app container)

**frontend/src/manifest.json**
- Cockpit module manifest
- Menu entry configuration
- Version information
- Dependencies

**views/default.json**
- Default view configurations
- Shipped with package
- Provides standard views (All, Sections, Installed, Updates)

**views/examples/container-store.json**
- Example configuration for Container Store
- Shows section filtering
- Card layout configuration
- Featured packages

**views/examples/system-admin.json**
- Example configuration for system administration
- Section filter for admin and utils
- Table layout

## Module Contracts

### Python Backend Contract

**CLI Interface:**
```bash
cockpit-apt-bridge <command> [arguments]
# Or: python -m cockpit_apt_bridge <command> [arguments]
```

**Input:** Command-line arguments
- argv[1]: Command name (search, details, sections, etc.)
- argv[2...]: Command arguments

**Output:** JSON to stdout
- Success: Valid JSON object or array
- Error: JSON error object to stderr, exit code != 0

**Error Format:**
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Optional additional details"
}
```

**Performance Targets:**
- Search: <500ms (after initial cache load)
- Details: <200ms
- List operations: <1s

**Memory:**
- Maximum: 150MB per invocation
- No memory leaks (process exits after response)

**Code Quality:**
- Type hints on all functions (checked by pyright)
- Linted with ruff (strict mode)
- PEP 8 compliant
- 90% test coverage target

### TypeScript API Contract

**Input:** Function parameters (typed)
**Output:** Promises resolving to typed data or rejecting with APTError

**Function Signatures:**
- Query functions: Promise<DataType>
- Operation functions: Promise<void> with optional progress callback
- Utility functions: Synchronous or Promise depending on operation

**Error Handling:**
- All errors thrown as APTError instances
- Error code always present
- User-friendly error messages

**Caching:**
- Transparent to caller
- Cache invalidation automatic
- Manual cache clearing available

### UI Component Contract

**Props:**
- Typed interfaces for all props
- Required vs optional clearly defined
- Callback functions typed

**State:**
- Local state for UI-only concerns
- Shared state via hooks
- No direct cache access (use hooks)

**Effects:**
- Cleanup on unmount
- Abort ongoing operations
- Remove event listeners

**Accessibility:**
- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management

## Architecture Decisions

### Design for AppStream Extensibility

**Context:** APT repositories can provide AppStream metadata (icons, screenshots, rich descriptions, content ratings) that significantly enhances the package browsing experience. This will be added as a high-priority post-MVP feature (Phase 1.5 in TECHNICAL_SPEC.md).

**Architectural Implications:**

1. **Extensible Data Models**: The `PackageDetails` interface includes optional AppStream fields (appstreamId, icon, screenshots, categories, etc.) that will be null in MVP but populated when AppStream support is added.

2. **Graceful Degradation**: UI components must be designed to work with or without AppStream metadata:
   - PackageCard: Show placeholder icon if AppStream icon not available
   - PackageDetails: Show screenshots carousel only if screenshots available
   - SearchView: Work with both Debian sections and AppStream categories

3. **Separation of Concerns**: AppStream parsing will be a separate module (`appstream-parser.py`) that enhances core APT data without breaking existing functionality.

4. **Configuration System**: View configurations support both Debian sections and AppStream categories, making them forward-compatible.

**Implementation Guidelines:**

- **MVP Phase**: All AppStream-related fields return null/undefined
- **UI Components**: Use conditional rendering for AppStream features
- **Testing**: Test both with and without AppStream data
- **Documentation**: Note which features require AppStream metadata

**Benefits:**
- MVP can ship without AppStream dependency
- No architectural changes needed when adding AppStream
- Users get progressive enhancement as repositories add AppStream metadata

### Other Key Decisions

**Three-Tier Architecture**: Separating Python backend, TypeScript API, and React UI provides clear boundaries and testability.

**Configuration-Driven Views**: JSON-based view definitions enable extensibility without code changes (critical for Container Store use case).

**In-Memory Caching**: Avoids persistent cache complexity while providing performance benefits.

**Hybrid APT Approach**: python-apt for queries (rich data access) + apt-get for operations (proven, battle-tested).

## Development Phases

### Phase 1: Infrastructure and Foundation

**Duration:** 1-2 weeks

**Goals:**
- Project setup complete
- Build system functional
- Testing framework configured
- Basic Python backend operational
- TypeScript API skeleton implemented

**Deliverables:**
- Repository structure created
- package.json with dependencies
- esbuild configuration
- tsconfig.json with strict settings
- Python testing framework (pytest)
- TypeScript testing framework (Vitest)
- E2E testing framework (Playwright)
- Basic apt-bridge.py with search command
- Basic apt-wrapper.ts with search function
- Passing tests for implemented functionality

**Success Criteria:**
- npm run build succeeds
- npm run test passes all tests
- apt-bridge.py search returns valid JSON
- TypeScript compiles without errors
- Linting passes (eslint, prettier)

**Testing Requirements:**
- Python unit tests for cockpit-apt-bridge.py search function
- TypeScript unit tests for apt-wrapper.ts search function
- Integration test: TypeScript calls Python, parses JSON
- Mock python-apt for testing (no real APT access needed)
- Test coverage: 80%

### Phase 2: Python Backend Complete

**Duration:** 1-2 weeks

**Goals:**
- All python-apt queries implemented
- Complete JSON output for all commands
- Comprehensive error handling
- Performance optimization

**Deliverables:**
- All apt-bridge.py commands implemented
- Error handling for all edge cases
- Input validation
- Performance tests passing
- Documentation for all commands
- Test suite covering all commands
- Mock fixtures for testing without APT

**Success Criteria:**
- All commands return valid JSON
- Error cases handled gracefully
- Performance targets met (<500ms for search)
- Test coverage: 90%
- No memory leaks

**Testing Requirements:**
- Unit tests for each command (search, details, sections, etc.)
- Error case tests (package not found, invalid input)
- Performance tests (measure execution time)
- Integration tests with real python-apt (optional, dev environment)
- Mock tests for CI/CD (no APT dependency)
- Edge case tests (empty results, very long lists)

### Phase 3: TypeScript API Layer

**Duration:** 1-2 weeks

**Goals:**
- Complete TypeScript API implementation
- Cache manager operational
- Error handling complete
- Progress callback system working

**Deliverables:**
- All apt-wrapper.ts functions implemented
- Cache manager with TTL
- Error translation complete
- Progress parser for apt-get Status-Fd
- TypeScript hooks implemented
- Test suite for all API functions
- Integration tests with Python backend

**Success Criteria:**
- All API functions typed correctly
- Cache invalidation working
- Progress callbacks firing correctly
- Error messages user-friendly
- Test coverage: 85%

**Testing Requirements:**
- Unit tests for each API function
- Cache behavior tests (hit, miss, invalidation, TTL)
- Error handling tests (network errors, Python errors)
- Progress parsing tests (Status-Fd output)
- Mock cockpit.spawn for testing
- Integration tests: TypeScript -> Python -> JSON parsing
- Async/Promise handling tests

### Phase 4: Core UI Components

**Duration:** 2-3 weeks

**Goals:**
- All view components implemented
- Common components library complete
- Routing functional
- Basic styling applied

**Deliverables:**
- SearchView component
- SectionsView component
- SectionPackageList component
- PackageDetails component
- All common components
- Routing logic
- PatternFly integration
- Component tests
- Storybook (optional, for component development)

**Success Criteria:**
- All views navigable
- Components render without errors
- Responsive design works
- Accessibility tests pass
- Test coverage: 80%

**Testing Requirements:**
- Component render tests (React Testing Library)
- User interaction tests (click, type, submit)
- Navigation tests (routing)
- Error state tests
- Loading state tests
- Empty state tests
- Accessibility tests (axe-core)
- Visual regression tests (optional, Percy/Chromatic)

### Phase 5: Configuration System

**Duration:** 1 week

**Goals:**
- Configuration loading implemented
- Validation working
- Custom views rendering
- Example configurations provided

**Deliverables:**
- config-loader.ts complete
- Configuration validation
- CustomView component
- default.json configuration
- Example configurations
- Configuration documentation
- Tests for configuration system

**Success Criteria:**
- Configurations load correctly
- Invalid configs logged, not crash
- Custom views render based on config
- Validation catches errors
- Test coverage: 90%

**Testing Requirements:**
- Configuration parsing tests
- Validation tests (valid and invalid configs)
- Merge logic tests (built-in + system + user)
- CustomView rendering tests
- Error handling tests (malformed JSON)
- Integration tests: Load config -> Render view

### Phase 6: Operations Implementation

**Duration:** 1-2 weeks

**Goals:**
- Install/remove operations working
- Update package lists working
- Progress reporting functional
- Error handling complete
- Lock detection working

**Deliverables:**
- installPackage implementation
- removePackage implementation
- updatePackageLists implementation
- Progress modal component
- Lock detection and waiting
- Operation tests
- Manual test scenarios

**Success Criteria:**
- Operations succeed on real system
- Progress updates in real-time
- Errors handled gracefully
- Lock conflicts detected
- Test coverage: 75% (lower due to manual testing)

**Testing Requirements:**
- Unit tests for progress parsing
- Lock detection tests
- Error handling tests
- Integration tests with mock apt-get
- Manual tests on real system (cannot fully automate)
- Test scenarios: successful install, failed install, locked APT, no permissions
- Cache invalidation tests after operations

### Phase 7: Polish and Finalization

**Duration:** 1-2 weeks

**Goals:**
- UI polish complete
- Performance optimizations
- Documentation complete
- Packaging ready
- All tests passing

**Deliverables:**
- README.md complete
- CONTRIBUTING.md
- User documentation
- Debian package build working
- Performance optimizations applied
- Final test suite
- Release notes

**Success Criteria:**
- All features working
- Package installs correctly
- Documentation complete
- All tests passing
- Performance targets met
- No known critical bugs

**Testing Requirements:**
- Full regression test suite
- Performance benchmarks
- Package installation test
- Upgrade test (simulate package upgrade)
- E2E tests covering all major flows
- Cross-browser testing
- Accessibility audit

## Task Organization

Each task file (TASK_01 through TASK_06) corresponds to development phases 1-6.

**Task File Structure:**
- Overview and goals
- Detailed requirements
- Implementation steps
- Testing requirements (critical - must be comprehensive)
- Acceptance criteria
- Dependencies
- Estimated effort

**Task Dependencies:**
- Phase 1 must complete before Phase 2
- Phase 2 and Phase 3 can partially overlap
- Phase 4 depends on Phase 3 completion
- Phase 5 can start during Phase 4
- Phase 6 depends on Phase 3 and Phase 4
- Phase 7 runs after all others

## Quality Standards

### Code Quality

**TypeScript:**
- Strict mode enabled
- No implicit any
- All functions typed
- No ts-ignore (exceptions must be justified)

**Python:**
- Type hints on all functions
- PEP 8 compliance
- No global variables
- Docstrings on all public functions

**React:**
- Functional components only
- Hooks for state management
- Props validation with TypeScript
- No class components

### Testing Standards

**Coverage Targets:**
- Python: 90%
- TypeScript API: 85%
- React Components: 80%
- Overall: 85%

**Test Types:**
- Unit tests: Test individual functions/components
- Integration tests: Test module interactions
- E2E tests: Test complete user flows
- Manual tests: Document scenarios for manual validation

**Test Quality:**
- Each test has clear purpose
- Tests are independent (no shared state)
- Mocks used for external dependencies
- Tests run fast (<5s for unit tests, <30s for all)

### Documentation Standards

**Code Documentation:**
- All public functions documented
- Complex logic explained with comments
- TypeScript types serve as documentation

**User Documentation:**
- README with quick start
- Installation instructions
- Configuration guide
- Troubleshooting section

**Developer Documentation:**
- Architecture overview (TECHNICAL_SPEC.md)
- Project plan (this document)
- Task breakdown (TASK_*.md)
- State tracking (STATE.md)

## Development Workflow

### Git Workflow

**Branches:**
- main: Stable, releasable code
- develop: Integration branch (optional)
- feature/*: Feature branches
- bugfix/*: Bug fix branches

**Commits:**
- Conventional commits format
- feat: New feature
- fix: Bug fix
- test: Add/update tests
- docs: Documentation
- refactor: Code restructure
- chore: Maintenance

**Pull Requests:**
- All changes via PR
- Tests must pass
- Code review required (if team)
- Squash merge to main

### Development Environment

**Required Tools:**
- **Docker Desktop** - Container runtime (required for backend development)
- **Node.js 18+** - Frontend build and runtime
- **Git** - Version control

**Optional Tools:**
- **VS Code** with Dev Containers extension (recommended for full IDE integration)

**Backend Development (Container-Based):**

The backend requires python-apt which is Linux-only. We use Docker containers for cross-platform development:

**Option 1: CLI Workflow (All Platforms)**
```bash
# One-time setup
./run docker:build        # Build development container

# Development commands
./run test                # Run pytest in container
./run lint                # Run ruff linter
./run format              # Format code
./run typecheck           # Run pyright
./run shell               # Interactive shell in container
```

**Option 2: VSCode Dev Container (Recommended)**
```bash
# One-time setup
# 1. Install VSCode + Dev Containers extension
# 2. Open project in VSCode
# 3. Click "Reopen in Container"

# Then use terminal normally:
uv run pytest             # Terminal runs in container
uv run ruff check .       # Pylance works with real python-apt
# Full debugging and IDE features work
```

Both approaches use the same Docker Compose configuration.

**Container Stack:**
- Base: Debian Trixie (matches deployment target)
- Includes: Python 3.11+, python-apt, uv, ruff, pyright, pytest
- Volume: backend/ mounted to /workspace/backend
- VSCode extensions: Pylance, Ruff, debugpy (auto-installed in Dev Container)

**Frontend Development (Native):**
```bash
cd frontend
npm install               # Install dependencies
npm run build             # Build once
npm run watch             # Watch for changes
npm run test              # Run tests
npm run lint              # Lint and type check
```

Or use convenience commands from project root:
```bash
./run frontend:build
./run frontend:test
./run frontend:lint
```

**CI Commands:**
```bash
./run ci:test             # All tests (backend + frontend)
./run ci:lint             # All linters
```

**System Dependencies:**
- Docker Desktop (macOS/Windows) or Docker Engine (Linux)
- Node.js 18+ (for frontend)
- cockpit (Debian package, required for runtime deployment only)

### CI/CD

**GitHub Actions Workflows:**
- On PR: Run linting, type checking, tests (both backend and frontend)
- On merge to main: Build package, run full test suite
- On tag: Build Debian package, create GitHub release

**Required Checks:**

Backend:
- Ruff linting passes
- Pyright type checking passes
- Pytest unit tests pass (90% coverage)

Frontend:
- ESLint linting passes
- Prettier formatting passes
- TypeScript compilation passes
- Vitest unit tests pass (85% coverage)
- Playwright E2E tests pass (on Linux)
- Integration tests pass
- E2E tests pass (on Linux only)
- Build succeeds

## Deployment

### Package Building

**Build Process:**
1. npm run build (compile TypeScript, bundle assets)
2. Copy built files to debian staging
3. dpkg-buildpackage (create .deb)

**Package Contents:**
- /usr/share/cockpit/apt/ - All UI files
- /usr/share/cockpit/apt/apt-bridge.py - Python backend
- /usr/share/cockpit/apt/views/ - Default configurations
- /etc/cockpit/apt/views.d/ - Configuration directory (empty)

**Package Metadata:**
- Name: cockpit-apt
- Version: Semantic versioning (1.0.0)
- Architecture: all
- Depends: cockpit (>= 276), python3-apt

### Installation

**From Package:**
```
sudo dpkg -i cockpit-apt_1.0.0_all.deb
sudo apt-get install -f
```

**Access:**
- Navigate to Cockpit web interface
- Click "APT" in menu
- Use application

### Configuration

**System Administrators:**
- Create files in /etc/cockpit/apt/views.d/
- Files must be valid JSON
- Use examples from /usr/share/cockpit/apt/views/examples/

**No Configuration Required:**
- Application works out-of-box
- Default views provided
- Custom views are optional

## Maintenance

### Version Updates

**Minor Versions (1.x.0):**
- New features
- Configuration schema additions (backward compatible)
- UI improvements

**Patch Versions (1.0.x):**
- Bug fixes
- Performance improvements
- Documentation updates

**Major Versions (x.0.0):**
- Breaking changes
- Configuration schema changes (incompatible)
- Major architecture changes

### Deprecation Policy

**Warning Period:**
- Deprecation announced 1 major version before removal
- Warnings logged to console
- Documentation updated

**Migration Path:**
- Migration guide provided
- Automated migration if possible
- Support for old format during transition

## Success Metrics

**Performance:**
- Search results: <500ms
- Package details: <200ms
- Section list: <1s
- Install operation: Same as apt-get (variable)

**Reliability:**
- Zero crashes during normal operation
- Graceful degradation on errors
- No data corruption

**Usability:**
- Intuitive navigation
- Clear error messages
- Accessible to keyboard-only users
- Works on mobile devices

**Test Coverage:**
- Overall: 85%
- Critical paths: 95%
- All tests passing

## Risk Mitigation

### Technical Risks

**Risk:** python-apt API changes
**Mitigation:** Pin python3-apt version, test on upgrades, abstract API access

**Risk:** apt-get output format changes
**Mitigation:** Use Status-Fd (stable interface), fallback parsing

**Risk:** Performance issues with large package lists
**Mitigation:** Pagination, lazy loading, caching

### Process Risks

**Risk:** Scope creep
**Mitigation:** Strict adherence to phases, feature freeze before release

**Risk:** Inadequate testing
**Mitigation:** Require tests for all code, automated CI checks

**Risk:** Documentation lag
**Mitigation:** Document while implementing, not after

## Appendix

### Acronyms

- APT: Advanced Package Tool
- TTL: Time To Live
- UI: User Interface
- API: Application Programming Interface
- E2E: End-to-End
- CI/CD: Continuous Integration/Continuous Deployment

### References

- Cockpit Developer Guide
- python-apt Documentation
- PatternFly React Documentation
- Debian Policy Manual
- Semantic Versioning Specification
