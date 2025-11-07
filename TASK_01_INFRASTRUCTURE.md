# Task 01: Infrastructure and Foundation

**Phase:** 1
**Estimated Effort:** 1-2 weeks
**Dependencies:** None
**Status:** Not Started

## Overview

Establish the complete project infrastructure including build system, testing frameworks, project structure, and basic implementation of core modules to validate the architecture.

## Goals

- Create project structure with proper organization
- Configure build system (esbuild for TypeScript/React)
- Set up testing frameworks (Python: pytest, TypeScript: Vitest, E2E: Playwright)
- Implement basic Python backend (search command only)
- Implement basic TypeScript wrapper (search function only)
- Validate end-to-end flow: UI -> TypeScript -> Python -> APT

## Detailed Requirements

### Project Initialization

**Directory Structure Creation:**
- Create all directories per PROJECT_PLAN file tree
- Ensure proper permissions (755 for directories, 644 for files)
- Create placeholder README files in empty directories

**Git Setup:**
- Initialize Git repository if not already initialized
- Create .gitignore with appropriate exclusions
- Set up conventional commits configuration
- Add Git hooks for linting (optional, husky)

**Package Configuration:**
- Create package.json with all dependencies
- Configure npm scripts for common tasks
- Set up package versioning (start at 0.1.0 for development)

### Python Backend Setup (uv-based)

**Project Initialization:**
- Create backend/ directory
- Initialize with `uv init` (creates pyproject.toml)
- Set Python version in .python-version (3.11+)
- Configure pyproject.toml with project metadata

**Python Package Structure:**
```
backend/
├── pyproject.toml
├── .python-version
├── ruff.toml
├── pyrightconfig.json
└── cockpit_apt_bridge/
    ├── __init__.py
    ├── __main__.py
    ├── cli.py
    └── utils/
```

**Dependencies Configuration (pyproject.toml):**
```toml
[project]
name = "cockpit-apt-bridge"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "python-apt>=2.0.0",
]

[project.scripts]
cockpit-apt-bridge = "cockpit_apt_bridge.cli:main"

[tool.uv]
dev-dependencies = [
    "pytest>=7.0.0",
    "pytest-cov>=4.0.0",
    "ruff>=0.1.0",
    "pyright>=1.1.0",
]
```

**Ruff Configuration (ruff.toml):**
- Enable strict linting rules
- Configure line length (100 chars)
- Enable type checking integration
- Configure import sorting

**Pyright Configuration (pyrightconfig.json):**
- Enable strict mode
- Require type annotations
- No implicit optional
- No implicit returns

**Development Commands (via Docker container):**
- `./run docker:build` - Build development container
- `./run test` - Run tests in container
- `./run lint` - Lint code in container
- `./run format` - Format code in container
- `./run typecheck` - Type check in container
- `./run shell` - Open shell in container for manual testing

**Or use VSCode Dev Container for full IDE integration**

### Frontend Build System Configuration

**Directory Structure:**
```
frontend/
├── package.json
├── tsconfig.json
├── esbuild.config.js
├── .eslintrc.json
├── .prettierrc
└── src/
```

**esbuild Setup (frontend/esbuild.config.js):**
- Configure esbuild for TypeScript compilation
- Set up React JSX transformation
- Configure external dependencies (cockpit.js must not be bundled)
- Set up source map generation for development
- Configure minification for production
- Set up watch mode for development

**TypeScript Configuration (frontend/tsconfig.json):**
- Create tsconfig.json with strict settings
- Enable all strict type-checking options
- Configure path aliases for clean imports
- Set target to ES2020
- Configure JSX for React

**CSS/Assets Handling:**
- Configure PatternFly CSS import
- Set up CSS bundling
- Configure font file copying
- Handle image assets (if any)

**Build Outputs:**
- frontend/src/ compiles to frontend/dist/
- Single bundled JavaScript file: apt.js
- Single bundled CSS file: apt.css
- Copy static files: index.html, manifest.json

**Development Commands:**
- `npm install` - Install dependencies
- `npm run build` - Production build
- `npm run watch` - Development build with watch
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - ESLint + Prettier
- `npm run test` - Run Vitest tests

### Testing Framework Setup

**Backend Testing (pytest):**
- Configured in pyproject.toml via uv
- Install pytest and pytest-cov
- Create backend/tests/ directory
- Set up test discovery patterns (test_*.py)
- Configure coverage reporting (pytest-cov)
- Create fixtures for mocking python-apt Cache
- Write tests that don't require real APT (use mocks)

**Frontend Unit Testing (Vitest):**
- Install vitest and @vitest/ui
- Configure vitest.config.ts in frontend/
- Set up test utilities (@testing-library/react)
- Configure coverage reporting
- Create mocks for cockpit.spawn
- Test TypeScript API and React components

**E2E Testing (Playwright):**
- Install Playwright in frontend/
- Configure playwright.config.ts
- Set up Chromium browser
- Create test utilities for Cockpit navigation
- Document that E2E tests require running Cockpit instance
- Tests run against http://localhost:9090

**Test Commands:**

Backend (via Docker):
```bash
./run test                      # Run all tests
./run test --cov               # With coverage
./run test -v                  # Verbose output
```

Frontend (native):
```bash
cd frontend
npm run test                    # Run unit tests
npm run test:coverage          # With coverage
npm run test:e2e               # Run E2E tests (when implemented)
```

Or use convenience commands:
```bash
./run frontend:test            # Run frontend tests from root
./run ci:test                  # Run all tests (backend + frontend)
```

### Linting and Code Quality

**Backend Quality Tools (via uv):**

Ruff (linter and formatter):
- Replaces flake8, black, isort, etc.
- Configured in backend/ruff.toml
- Fast Rust-based tooling
- Automatic code formatting
- Import sorting built-in

Pyright (type checker):
- Configured in backend/pyrightconfig.json
- Strict mode enabled
- Checks all type annotations
- Integrates with VS Code

Commands (via Docker):
```bash
./run lint                      # Lint
./run lint:fix                  # Lint and auto-fix
./run format                    # Format
./run typecheck                 # Type check
```

Or from within Dev Container:
```bash
uv run ruff check .             # Lint
uv run ruff format .            # Format
uv run pyright                  # Type check
```

**Frontend Quality Tools:**

ESLint:
- Configure in frontend/.eslintrc.json
- TypeScript ESLint plugin
- React-specific rules
- Import sorting

Prettier:
- Configure in frontend/.prettierrc
- Coordinate with ESLint
- Automatic formatting

Commands:
```bash
cd frontend
npm run lint                    # ESLint + Prettier check
npm run lint:fix                # Auto-fix
npm run typecheck               # TypeScript check (tsc --noEmit)
```

### Basic Implementation

**Python Backend (cockpit-apt-bridge):**

Implement only the search command for validation. The backend is structured as a proper Python package:

**Package Structure:**
```
backend/cockpit_apt_bridge/
├── __init__.py           # Package init, version info
├── __main__.py           # Entry point: python -m cockpit_apt_bridge
├── cli.py                # CLI interface, argument parsing, main()
├── commands/
│   ├── __init__.py
│   └── search.py         # Search command implementation
└── utils/
    ├── __init__.py
    ├── apt_cache.py      # APT cache wrapper
    ├── formatters.py     # JSON formatting utilities
    └── errors.py         # Error classes
```

**Command Interface:** `cockpit-apt-bridge search QUERY`
(Or: `python -m cockpit_apt_bridge search QUERY`)

**Implementation Details:**

`cli.py`:
- Parse command-line arguments (sys.argv)
- Dispatch to command handlers
- Handle top-level errors
- Output JSON to stdout, errors to stderr

`commands/search.py`:
- Import and use `apt.cache.Cache()`
- Search package names and summaries
- Limit to 100 results
- Return structured dict (not JSON string)

`utils/formatters.py`:
- `format_package(pkg)` - Convert apt.Package to dict
- `to_json(data)` - Safe JSON serialization
- Handle encoding issues

`utils/errors.py`:
- `APTBridgeError` base class
- `PackageNotFoundError`
- `format_error(exception)` - Convert to JSON error

**Output Format (JSON to stdout):**
```json
[
  {
    "name": "nginx",
    "summary": "small, powerful, scalable web/proxy server",
    "version": "1.24.0-1",
    "installed": false,
    "section": "httpd"
  }
]
```

**Error Format (JSON to stderr):**
```json
{
  "error": "Failed to open APT cache",
  "code": "CACHE_ERROR",
  "details": "..."
}
```

**TypeScript Wrapper (apt-wrapper.ts):**

Implement only the searchPackages function for validation:

**Function:** `searchPackages(query: string): Promise<Package[]>`

**Functionality:**
- Call cockpit.spawn with cockpit-apt-bridge search command
- Parse JSON response
- Type-cast to Package[]
- Handle errors (JSON parse, spawn errors)
- Return typed Promise

**Error Handling:**
- Catch spawn errors
- Parse JSON errors from stderr
- Throw APTError with appropriate code
- Provide user-friendly error messages

**Types Definition (types.ts):**

Define all core types even if not all used yet:

**Required Types:**
- Package interface
- PackageDetails interface (extends Package)
  - **Important**: Include optional AppStream fields (appstreamId, icon, screenshots, etc.) as null-able fields
  - These will be null in MVP but allow for future AppStream integration without breaking changes
  - See TECHNICAL_SPEC.md for complete AppStream field list
- Section interface
- Dependency interface
- OperationProgress interface
- APTError class
- ProgressCallback type
- ViewConfiguration interface (basic structure)

**Design Note**: The data models are intentionally designed for AppStream extensibility. AppStream metadata integration is planned as a high-priority post-MVP feature (Phase 1.5). All AppStream fields should be optional and typed as `| null` to allow graceful degradation.

**React Shell (apt.tsx):**

Minimal React component for validation:

**Functionality:**
- Render "Cockpit APT" heading
- Simple search input
- Call searchPackages when user types
- Display results in basic table
- Show loading state
- Show error state

**Purpose:**
- Validate entire stack works end-to-end
- Not final UI (just proof of concept)

### Documentation

**README.md:**
- Project description
- Installation instructions
- Development setup
- Running tests
- Building the package
- Contributing guidelines (reference)

**CONTRIBUTING.md:**
- Code style guidelines
- Commit message format
- Pull request process
- Testing requirements

**Architecture Documentation:**
- Reference to TECHNICAL_SPEC.md
- Reference to PROJECT_PLAN.md
- Quick architecture overview for developers

## Implementation Steps

### Step 1: Project Structure

1. Create all directories as per file tree
2. Create empty files where needed (placeholders)
3. Copy TECHNICAL_SPEC.md and PROJECT_PLAN.md into repository
4. Initialize Git if needed
5. Create .gitignore

**Validation:** Directory structure matches PROJECT_PLAN

### Step 2: Package Configuration

1. Create package.json with dependencies
2. Run npm install
3. Verify all packages installed correctly
4. Create npm scripts for common tasks

**Validation:** npm install succeeds without errors

### Step 3: Build System

1. Create esbuild.config.js
2. Create tsconfig.json
3. Configure build for development mode
4. Configure build for production mode
5. Test build process

**Validation:** npm run build creates apt/ directory with compiled files

### Step 4: Python Environment

1. Create requirements.txt
2. Document virtual environment setup
3. Create pyproject.toml
4. Install Python dependencies

**Validation:** Python environment activates, dependencies installed

### Step 5: Testing Frameworks

1. Install pytest and configure
2. Install vitest and configure
3. Install Playwright and configure
4. Create test directories
5. Create sample test to validate setup

**Validation:** npm run test executes (even if no tests yet)

### Step 6: Linting Setup

1. Install and configure ESLint
2. Install and configure Prettier
3. Install Python linters
4. Create lint scripts
5. Run linters on empty project

**Validation:** npm run lint passes

### Step 7: Python Backend Basic Implementation

1. Create src/cockpit-apt-bridge
2. Implement search command
3. Add error handling
4. Add input validation
5. Test manually with python-apt

**Validation:** `./src/cockpit-apt-bridge search nginx` returns valid JSON

### Step 8: TypeScript Types

1. Create src/lib/types.ts
2. Define all interfaces
3. Export types
4. Verify TypeScript compilation

**Validation:** tsc compiles without errors

### Step 9: TypeScript Wrapper Basic Implementation

1. Create src/lib/apt-wrapper.ts
2. Implement searchPackages function
3. Add error handling
4. Create APTError class
5. Add JSDoc comments

**Validation:** Function compiles, types are correct

### Step 10: React Shell

1. Create src/apt.tsx
2. Implement basic search UI
3. Wire up searchPackages call
4. Display results
5. Build and test in browser

**Validation:** Can search for packages in Cockpit

### Step 11: Documentation

1. Write README.md
2. Write CONTRIBUTING.md
3. Add inline code comments
4. Document build process
5. Document testing process

**Validation:** New developer can set up project from README

## Testing Requirements

### Python Backend Tests

**Test File:** test/python/test_apt_bridge.py

**Test Cases:**

**test_search_by_name:**
- Search for package by exact name
- Verify package appears in results
- Verify required fields present
- Verify JSON structure valid

**test_search_by_summary:**
- Search for term in package summary
- Verify matching packages returned
- Verify search is case-insensitive

**test_search_limit:**
- Search for very common term (e.g., "lib")
- Verify results limited to 100
- Verify most relevant results first

**test_search_no_results:**
- Search for nonexistent package
- Verify empty array returned
- Verify no error thrown

**test_search_empty_query:**
- Provide empty search string
- Verify appropriate behavior (error or empty results)

**test_error_handling:**
- Mock python-apt to raise exception
- Verify JSON error output
- Verify non-zero exit code

**Test Fixtures:**
- Mock apt cache with known packages
- Sample package data for assertions
- Use pytest fixtures for setup/teardown

**Coverage Target:** 95% for search command

### TypeScript Wrapper Tests

**Test File:** test/unit/apt-wrapper.test.ts

**Test Cases:**

**test_searchPackages_success:**
- Mock cockpit.spawn to return valid JSON
- Call searchPackages
- Verify Promise resolves with Package[]
- Verify types are correct

**test_searchPackages_json_parse_error:**
- Mock cockpit.spawn to return invalid JSON
- Call searchPackages
- Verify Promise rejects with APTError
- Verify error code is PARSE_ERROR

**test_searchPackages_spawn_error:**
- Mock cockpit.spawn to reject
- Call searchPackages
- Verify Promise rejects with APTError
- Verify error message is user-friendly

**test_searchPackages_empty_results:**
- Mock cockpit.spawn to return []
- Call searchPackages
- Verify Promise resolves with empty array

**test_APTError_construction:**
- Create APTError instances
- Verify properties set correctly
- Verify instanceof Error

**Mocking Strategy:**
- Mock cockpit.spawn using vitest.mock
- Create reusable mock factory functions
- Test both success and failure paths

**Coverage Target:** 90%

### Integration Tests

**Test File:** test/integration/search-flow.test.ts

**Test Cases:**

**test_end_to_end_search:**
- Mock cockpit.spawn to call real cockpit-apt-bridge (in test environment)
- Mock python-apt with test fixture
- Call searchPackages
- Verify results flow through entire stack
- Verify types maintained

**test_error_propagation:**
- Simulate Python error (mock stderr output)
- Call searchPackages
- Verify error properly translated to APTError
- Verify error code preserved

**Setup:**
- Requires Python environment
- Requires mock python-apt or test APT cache
- May require Docker container for CI

**Coverage Target:** Key integration paths tested

### E2E Tests

**Test File:** test/e2e/search.spec.ts

**Test Cases:**

**test_search_in_ui:**
- Load Cockpit APT page
- Type in search box
- Verify results appear
- Verify loading state shows
- Verify error state works

**Setup:**
- Requires running Cockpit instance
- May run in Docker container
- Use Playwright for browser automation

**Note:** Full E2E tests may be deferred to later phases

**Coverage Target:** Basic smoke test only for Phase 1

### Manual Test Scenarios

**Scenario 1: Basic Search**
- Open Cockpit APT
- Type "nginx" in search box
- Verify results appear
- Verify nginx package is in results
- Verify installed status is correct

**Scenario 2: No Results**
- Search for "xyzabc12345"
- Verify empty state shows
- Verify no errors shown

**Scenario 3: Error Handling**
- Rename cockpit-apt-bridge temporarily
- Try to search
- Verify error message appears
- Restore cockpit-apt-bridge

## Acceptance Criteria

### Build System

- npm run build succeeds without errors
- Output files created in apt/ directory
- Source maps generated in development mode
- Minification works in production mode
- Watch mode rebuilds on file changes

### Testing Framework

- npm run test executes all test suites
- Python tests run with pytest
- TypeScript tests run with vitest
- Coverage reports generated
- All sample tests pass

### Linting

- npm run lint passes on all code
- ESLint configured for TypeScript and React
- Prettier formats code consistently
- Python code passes flake8/ruff

### Basic Implementation

- cockpit-apt-bridge search command returns valid JSON
- searchPackages TypeScript function works
- End-to-end flow validated: UI -> TS -> Python -> APT
- Basic React UI displays search results
- Error handling works for common cases

### Documentation

- README has clear setup instructions
- CONTRIBUTING guidelines documented
- Code has appropriate comments
- Architecture documented

### Code Quality

- TypeScript strict mode enabled, no errors
- All types defined in types.ts
- No any types used (except where necessary)
- Python has type hints
- Test coverage meets targets (Python: 95%, TypeScript: 90%)

## Dependencies

None - this is the foundational task.

## Risks and Mitigations

**Risk:** python-apt not available on macOS for development
**Mitigation:** ✅ RESOLVED - Docker development container with Debian Trixie provides python-apt. VSCode Dev Container gives full IDE integration.

**Risk:** Complex build system configuration
**Mitigation:** Start with minimal esbuild config, iterate. Use proven patterns from cockpit ecosystem.

**Risk:** Testing framework integration issues
**Mitigation:** Use popular, well-documented tools (pytest, vitest, Playwright)

**Risk:** Time spent on tooling vs. implementation
**Mitigation:** Use defaults where possible, don't over-optimize initially

**Risk:** Container overhead slowing development iteration
**Mitigation:** Volume mounts keep files in sync. VSCode Dev Container provides native IDE experience.

## Container Development Environment

### Docker Infrastructure

**docker/Dockerfile.devtools:**
- Base: Debian Trixie (matches deployment target)
- Installs: python3, python3-apt, python3-pip, uv, curl, git, sudo
- Creates non-root user (vscode) for Dev Container compatibility
- Working directory: /workspace/backend

**docker/docker-compose.devtools.yml:**
- Builds devtools image
- Mounts backend/ directory to /workspace/backend
- Runs as non-root user
- Interactive shell by default

### VSCode Dev Container

**.devcontainer/devcontainer.json:**
- References docker-compose.devtools.yml service
- Installs Python extensions (Pylance, Ruff, debugpy)
- Configures Python settings (interpreter, testing, formatting)
- Runs `uv pip install -e '.[dev]'` after container creation
- Provides full IDE integration inside container

### CLI Development Commands

**./run script:**
- `docker:build` - Build development container image
- `test` - Run backend tests in container
- `lint` - Run ruff linter in container
- `lint:fix` - Run ruff with auto-fix
- `format` - Format code with ruff
- `typecheck` - Run pyright type checker
- `shell` - Interactive bash shell in container
- `frontend:*` - Frontend development commands (native)
- `ci:test` - Run all tests (backend + frontend)
- `ci:lint` - Run all linters

### Workflow Comparison

**CLI Workflow (All platforms):**
```bash
./run docker:build    # One-time setup
./run test           # Run tests
./run shell          # Manual testing
```

**VSCode Dev Container (Recommended for IDE users):**
1. Install VSCode + Dev Containers extension + Docker
2. Open project → "Reopen in Container"
3. Terminal, Pylance, debugging all work inside container
4. Can still use ./run commands if desired

Both workflows share the same Docker Compose configuration.

## Deliverables Checklist

- [ ] Project structure created and matches PROJECT_PLAN
- [ ] Docker development container (Dockerfile.devtools + compose)
- [ ] VSCode Dev Container configuration (.devcontainer/)
- [ ] ./run script with all development commands
- [ ] package.json configured with all dependencies
- [ ] esbuild.config.js configured and working
- [ ] tsconfig.json configured with strict mode
- [ ] Testing frameworks installed and configured
- [ ] Linting tools installed and configured
- [ ] cockpit-apt-bridge implements search command
- [ ] apt-wrapper.ts implements searchPackages function
- [ ] types.ts defines all core types
- [ ] Basic React UI validates end-to-end flow
- [ ] Python tests written and passing (95% coverage)
- [ ] TypeScript tests written and passing (90% coverage)
- [ ] Integration test validates full stack
- [ ] README.md provides clear setup instructions
- [ ] CONTRIBUTING.md documents development workflow
- [ ] npm run build succeeds
- [ ] npm run test passes all tests
- [ ] npm run lint passes
- [ ] Manual test scenarios validated

## Next Steps

After Task 01 completion, proceed to:
- **Task 02:** Complete Python backend with all commands
- **Task 03:** Complete TypeScript API wrapper (depends on Task 02)

## Notes

This task establishes the foundation for the entire project. Quality and correctness here will save significant time later. Do not rush - ensure testing framework is solid and build system is reliable.

The basic implementation (search only) serves to validate the architecture before investing in complete implementation. If issues are found with the approach, they can be addressed now before full implementation.
