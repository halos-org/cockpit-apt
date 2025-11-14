⚠️ **THESE RULES ONLY APPLY TO FILES IN /cockpit-apt/** ⚠️

# Cockpit APT - Development Guide

Modern APT package manager interface for Cockpit, inspired by Raspberry Pi's Add/Remove Software.

**Local Instructions**: For environment-specific instructions and configurations, see @CLAUDE.local.md (not committed to version control).

## Git Workflow Policy

**Branch Workflow:** Never push to main directly - always use feature branches and PRs.

## Project Context

This is a web-based package manager for Cockpit that provides a modern interface to APT, similar to GNOME Software or Raspberry Pi's Add/Remove Software. It's designed for the HaLOS distribution but works on any Debian/Ubuntu system with Cockpit.

## Architecture

### Three-Tier Design

1. **Backend** (`backend/`): Python CLI using python-apt
   - JSON input/output for structured communication
   - Command-based interface: search, details, install, remove, etc.
   - Runs via cockpit.spawn (no persistent daemon)

2. **API Layer** (`frontend/src/lib/`): TypeScript wrapper
   - Wraps cockpit.spawn calls
   - Provides type-safe Promise-based API
   - Handles error translation and progress reporting

3. **UI Layer** (`frontend/src/`): React + PatternFly
   - Browse by Debian section
   - Search and package details
   - Install/remove operations with progress

### Key Technologies

- **Backend**: Python 3.11+, python-apt, uv, ruff, pyright
- **Frontend**: React 18, TypeScript, PatternFly 6, esbuild, vitest
- **Integration**: Cockpit API (cockpit.spawn, cockpit.file)
- **Testing**: pytest (backend), vitest (frontend)

## Development Environment

### Container-Based Workflow (Required for Backend)

The backend requires python-apt which is Linux-only. We use Docker containers for consistent development across platforms.

**Quick Start:**
```bash
# Build development container
./run docker:build

# Run tests
./run test

# Open shell
./run shell
```

### VSCode Dev Container (Recommended)

For full IDE integration with Pylance and debugging:

1. Install VSCode + Dev Containers extension + Docker Desktop
2. Open project in VSCode
3. Click "Reopen in Container"
4. Everything works: Pylance, debugging, terminal

**Configuration**: `.devcontainer/devcontainer.json` references `docker/docker-compose.devtools.yml`

### CLI and VSCode Use Same Container

The Dev Container setup shares the same Docker Compose configuration as the CLI commands. This ensures:
- Identical environments
- No duplicate configuration
- CLI works for non-VSCode users
- VSCode users get full IDE features

See [README.md](README.md) for detailed setup instructions.

## Project Structure

```
backend/                          # Python backend
  cockpit_apt_bridge/             # Main package
    cli.py                        # Entry point
    commands/                     # Command handlers
      search.py, details.py, ...
    utils/                        # Shared utilities
      errors.py                   # Error handling
      formatters.py               # JSON output
      apt_cache.py                # APT cache wrapper
  tests/                          # Backend tests
  pyproject.toml                  # Dependencies & config

frontend/                         # TypeScript/React frontend
  src/
    lib/                          # Core libraries
      types.ts                    # Type definitions
      apt-wrapper.ts              # Backend API wrapper
    components/                   # React components
      section-list.tsx
      package-list.tsx
      package-details.tsx
    hooks/                        # React hooks
    apt.tsx                       # Root component
    index.html                    # HTML shell
    manifest.json                 # Cockpit manifest
  package.json                    # Dependencies
  tsconfig.json                   # TypeScript config
  esbuild.config.js               # Build configuration

docker/                           # Development containers
  Dockerfile.devtools
  docker-compose.devtools.yml

.devcontainer/                    # VSCode Dev Container
  devcontainer.json

views/                            # Custom view definitions (JSON)
debian/                           # Debian packaging
docs/                             # Documentation
  TECHNICAL_SPEC.md
  PROJECT_PLAN.md
  TASK_*.md
```

## Development Workflow

### Feature Development Process

**Standard Workflow for All Features:**

1. **Implement** the feature or fix
2. **Test locally** - ensure all tests pass
3. **Commit** to a feature branch
4. **Create PR** and push to remote
5. **Wait 180 seconds** for CI checks and GitHub Copilot code review
6. **Check PR status** - verify tests pass, review Copilot comments and any human review feedback
7. **Iterate** if needed, then merge

**Detailed Steps:**

#### 1. Create Feature Branch

```bash
git checkout -b feat/my-feature-name
# or: fix/bug-description, docs/update-readme, etc.
```

#### 2. Implement Feature

Write code following the project patterns. See "Common Development Tasks" below for examples.

#### 3. Run Tests Locally

**Backend tests:**
```bash
./run test              # All tests
./run test -v           # Verbose
./run test -k "search"  # Specific tests
```

**Frontend tests:**
```bash
cd frontend
npm run test            # Unit tests
npm run test:e2e        # E2E tests (requires test server)
```

**All tests:**
```bash
# Backend tests
./run test

# Frontend tests
cd frontend && npm run test

# Type checking
./run typecheck
cd frontend && npm run typecheck

# Linting
./run lint
cd frontend && npm run lint
```

#### 4. Commit Changes

```bash
git add .
git commit -m "feat(scope): description

Longer explanation if needed.

Fixes #123"
```

Follow conventional commit format (see "Git Commit Format" below).

#### 5. Push and Create PR

```bash
git push -u origin feat/my-feature-name
```

Then create PR via GitHub CLI or web interface:

```bash
# Using gh CLI
gh pr create --title "feat: Add feature X" --body "Description..."

# Or visit GitHub web UI
```

#### 6. Wait for CI Checks and Code Review

**Wait 180 seconds** for automated checks to complete:

**CI Checks (GitHub Actions):**
- Backend tests (pytest)
- Frontend tests (vitest)
- Type checking (pyright, tsc)
- Linting (ruff, eslint)

**Automated Code Review:**
- GitHub Copilot performs automatic code review
- Provides suggestions and identifies potential issues
- Comments appear directly on the PR

#### 7. Check PR Status

```bash
# Check PR status
gh pr view

# Check CI checks
gh pr checks

# View PR in browser
gh pr view --web
```

**If checks fail:**
- Review the error logs in GitHub Actions
- Fix issues locally
- Run tests again
- Commit and push fixes
- Wait another 180 seconds for checks

**If checks pass:**
- Review GitHub Copilot's automated comments
- Address any suggestions from automated review
- Wait for human review comments (if any)
- Address review feedback
- Merge when approved

#### 8. Merge PR

```bash
# Merge via CLI
gh pr merge --squash  # or --merge, --rebase

# Or use GitHub web UI
```

### Workflow Example

Complete example of adding a new feature:

```bash
# 1. Create branch
git checkout -b feat/add-package-compare

# 2. Implement feature
# ... edit files ...

# 3. Run all local tests
./run test                          # Backend: 129 tests
cd frontend && npm run test         # Frontend: 156 tests
npm run typecheck                   # TypeScript: 0 errors
cd ..

# 4. Commit
git add .
git commit -m "feat(ui): add package comparison view

Allows users to compare versions and dependencies of multiple packages.

Relates to #45"

# 5. Push and create PR
git push -u origin feat/add-package-compare
gh pr create \
  --title "feat(ui): Add package comparison view" \
  --body "Implements package comparison feature requested in #45"

# 6. Wait for CI checks and Copilot review
# Poll status: gh pr checks

# 7. Check status
gh pr checks
# ✓ Backend tests - pytest
# ✓ Frontend tests - vitest
# ✓ Type checking - pyright/tsc
# ✓ Linting - ruff/eslint

gh pr view
# Status: All checks passed
# Reviews: 1 review from GitHub Copilot (automated)
#          Awaiting human review

# Review Copilot comments in web UI
gh pr view --web

# 8. After approval, merge
gh pr merge --squash
git checkout main
git pull origin main
```

### When Tests Fail in CI

**Common scenarios:**

1. **Tests pass locally but fail in CI:**
   - Check for environment differences
   - Review CI logs for specific failures
   - May need to update mocks or fixtures

2. **Linting/type errors in CI:**
   - Run locally: `./run lint && ./run typecheck`
   - Fix issues and commit
   - Push and wait again

3. **Timeout or infrastructure issues:**
   - Re-run the checks (GitHub UI or `gh run rerun`)
   - Check GitHub Status page for outages

### Backend Development

```bash
# Run tests (in container)
./run test

# Lint and format
./run lint
./run format

# Type checking
./run typecheck

# Interactive development
./run shell
uv run python -m cockpit_apt_bridge search nginx
```

### Frontend Development

```bash
# Install dependencies (first time)
cd frontend && npm install

# Build once
npm run build

# Watch for changes
npm run watch

# Run tests
npm run test

# Type checking
npm run typecheck
```

### Testing Strategy

**Backend (pytest)**:
- Mock apt.Cache for fast unit tests
- Test each command independently
- Test error handling and edge cases
- See `backend/tests/test_search.py` for examples

**Frontend (vitest)**:
- Test TypeScript API wrapper
- Test React components with React Testing Library
- Mock cockpit.spawn for isolation
- E2E tests with Playwright

### Code Quality

**Backend**:
- **ruff**: Linting and formatting (replaces flake8, black, isort)
- **pyright**: Strict type checking
- **pytest**: Unit tests with coverage

**Frontend**:
- **ESLint**: Linting
- **Prettier**: Formatting
- **TypeScript**: Strict mode type checking
- **vitest**: Unit tests

### CI/CD Pipeline

**GitHub Actions runs on every PR:**

**Checks performed:**
1. **Backend Tests** - `./run test`
   - 129 tests via pytest
   - 89% code coverage
   - Python 3.11+ in Docker container

2. **Frontend Tests** - `npm run test`
   - 156 tests via vitest
   - Component and integration tests
   - Mock cockpit API

3. **Backend Type Checking** - `./run typecheck`
   - pyright strict mode
   - Full type coverage

4. **Frontend Type Checking** - `npm run typecheck`
   - TypeScript strict mode
   - Must have 0 errors

5. **Backend Linting** - `./run lint`
   - ruff checks
   - Code style enforcement

6. **Frontend Linting** - `npm run lint`
   - ESLint + Prettier
   - Code style enforcement

**CI Run Time:** ~3-5 minutes total

**Wait Time:** 180 seconds (3 minutes) is usually sufficient for:
- All CI checks to complete
- GitHub Copilot to perform automated code review

**Check Results:**
- ✅ All checks pass → Review Copilot comments → Address feedback → Ready for human review
- ❌ Any check fails → Fix locally, commit, push, wait 180s again

**Automated Reviews:**
- GitHub Copilot automatically reviews all PRs
- Provides suggestions for code improvements
- Identifies potential bugs or issues
- Comments appear in PR within ~3 minutes

**Note:** E2E tests (Playwright) are NOT run in CI as they require a live Cockpit server. These must be run manually against a test environment.

## Implementation Status

### Phase 1: Infrastructure (COMPLETED)

✅ Project structure with backend/ and frontend/ separation
✅ Backend: uv, ruff, pyright, pytest setup
✅ Frontend: npm, esbuild, TypeScript, React setup
✅ Docker development environment
✅ VSCode Dev Container configuration
✅ CLI development commands (./run script)
✅ Basic search command implementation
✅ Test infrastructure

### Phase 2: PackageKit Integration (IN PROGRESS - Next)

See [TASK_02_PACKAGEKIT_INTEGRATION.md](docs/TASK_02_PACKAGEKIT_INTEGRATION.md)

- Implement all backend commands
- Add Debian section mapping
- Complete test coverage

### Future Phases

See [PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for complete roadmap:
- Phase 3: Core UI components
- Phase 4: Features (install, remove, search, sections)
- Phase 5: Polish and testing
- Phase 6: Documentation and packaging

## AppStream Integration (Phase 1.5)

APT repositories can provide AppStream metadata (icons, screenshots, categories). This will be implemented shortly after MVP as "Phase 1.5".

**Design approach**: All AppStream fields are optional/nullable in type definitions. UI components conditionally render based on availability. No architectural changes needed.

## Common Development Tasks

### Adding a New Backend Command

1. Create `backend/cockpit_apt_bridge/commands/mycommand.py`
2. Implement `execute(args) -> result` function
3. Add handler in `cli.py`
4. Write tests in `backend/tests/test_mycommand.py`
5. Run: `./run test && ./run lint && ./run typecheck`

### Adding a New Frontend Component

1. Create `frontend/src/components/MyComponent.tsx`
2. Add types to `frontend/src/lib/types.ts` if needed
3. Import and use in parent component
4. Run: `npm run typecheck && npm run lint`
5. Write tests in `__tests__/MyComponent.test.tsx`

### Testing Changes

```bash
# Backend
./run test -v

# Frontend
cd frontend && npm run test

# All
./run ci:test
```

## Debugging

### Backend Debugging

**With VSCode Dev Container**:
- Set breakpoints in Python files
- F5 to debug tests
- Use Debug Console

**With CLI**:
```bash
./run shell
uv run python -m pdb -m cockpit_apt_bridge search test
```

### Frontend Debugging

**Browser DevTools**:
- Build with `npm run build` (includes sourcemaps)
- Open http://localhost:9090/apt in browser
- F12 → Sources tab → Find TypeScript files

**VSCode**:
- Install "Debugger for Firefox" extension
- F5 to launch browser with debugger attached

## Common Issues

### Backend

**"apt module not found" on macOS**:
- Expected! Use `./run test` which runs in Docker
- Or use VSCode Dev Container

**Tests fail in container**:
```bash
./run docker:clean
./run docker:build
./run test -v
```

**Type errors**:
```bash
./run typecheck
```

### Frontend

**Build errors**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Module not loading in Cockpit**:
- Check browser console (F12)
- Verify manifest.json is valid
- Restart cockpit: `sudo systemctl restart cockpit`

## Documentation

- **[README.md](README.md)**: User-facing setup and usage guide
- **[TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md)**: Complete technical specification
- **[PROJECT_PLAN.md](docs/PROJECT_PLAN.md)**: Implementation roadmap and phases
- **Task files**: Detailed task breakdowns (docs/TASK_*.md)

## Code Patterns

### Backend: Command Handler

```python
def execute(query: str) -> list[dict[str, Any]]:
    """Execute search command."""
    if len(query) < 2:
        raise APTBridgeError("Query too short", "INVALID_QUERY")

    cache = apt.Cache()
    results = []
    for pkg in cache:
        if matches(pkg, query):
            results.append(format_package(pkg))
    return results[:100]  # Limit results
```

### Frontend: API Wrapper

```typescript
export async function searchPackages(query: string): Promise<Package[]> {
  if (query.length < 2) {
    throw new APTError("Query too short", "INVALID_QUERY");
  }

  const result = await spawnCommand(["cockpit-apt-bridge", "search", query]);
  return JSON.parse(result) as Package[];
}
```

### Frontend: React Component

```typescript
function PackageList({ packages }: Props) {
  return (
    <List>
      {packages.map(pkg => (
        <ListItem key={pkg.name}>
          <PackageCard package={pkg} />
        </ListItem>
      ))}
    </List>
  );
}
```

## Git Commit Format

Follow conventional commit format:
- `feat(search): add case-insensitive matching`
- `fix(install): handle permission errors`
- `docs: update README with container setup`
- `test(backend): add search edge case tests`
- `refactor(ui): extract PackageCard component`

## References

- [Cockpit Guide](https://cockpit-project.org/guide/latest/)
- [python-apt Documentation](https://apt-team.pages.debian.net/python-apt/)
- [PatternFly React](https://www.patternfly.org/get-started/develop/)
- [Debian Policy - Sections](https://www.debian.org/doc/debian-policy/ch-archive.html#s-subsections)

Part of the [HaLOS](https://github.com/hatlabs/halos-distro) distribution.
