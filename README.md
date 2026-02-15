# Cockpit APT

Modern APT package manager interface for Cockpit, providing a user-friendly graphical interface to manage Debian/Ubuntu packages.

## Features

### Package Management
- **Install/Remove Packages**: One-click installation and removal with real-time progress tracking
- **Update Package Lists**: Refresh available package information from repositories
- **Safety Checks**: Prevents removal of essential system packages (dpkg, apt, systemd, bash)
- **Progress Reporting**: Live status updates during package operations

### Package Discovery
- **Browse by Category**: Navigate packages organized by Debian sections (games, web, development, admin, etc.)
- **Search Functionality**: Fast package search by name and description
- **Installed Packages**: View all currently installed packages
- **Available Updates**: See packages that have newer versions available

### Package Information
- **Detailed View**: Package description, version, size, maintainer, homepage
- **Dependencies**: View packages required by this package
- **Reverse Dependencies**: See which packages depend on this package
- **File List**: Browse files installed by a package

### User Interface
- **Modern Design**: Clean PatternFly 6-based interface integrated into Cockpit
- **Tab Navigation**: Easy switching between Sections, Search, Installed, and Updates views
- **Keyboard Support**: Full keyboard navigation and accessibility
- **Responsive Layout**: Works on desktop and tablet screens

## Usage

### Accessing Cockpit APT

1. Open Cockpit in your browser: `https://your-server:9090`
2. Log in with your system credentials
3. Click "APT" in the left navigation menu

### Managing Packages

**Installing a Package:**
1. Use Search tab or browse by Section
2. Click on a package to view details
3. Click "Install" button
4. Watch real-time progress as the package installs
5. Package card updates to show "Installed" status

**Removing a Package:**
1. Go to Installed tab or find the package via Search
2. Click on the installed package
3. Click "Remove" button
4. Confirm the removal
5. Watch progress as the package is removed

**Updating Package Lists:**
1. Click "Update" button in any view
2. APT will refresh package information from repositories
3. New packages and updates become available

**Browsing by Category:**
1. Go to Sections tab
2. Click on a category (e.g., "games", "web", "devel")
3. Browse packages in that category
4. Click any package for details

### Safety Features

- **Essential Package Protection**: Cannot remove critical system packages (dpkg, apt, systemd, bash, etc.)
- **Input Validation**: Package names are validated to prevent injection attacks
- **Error Handling**: Clear error messages for common issues (locked, not found, disk full)
- **Lock Detection**: Detects when another package manager is running

## Architecture

- **Backend**: Python 3.11+ using python-apt library
- **Frontend**: React 18 + TypeScript with PatternFly 6
- **Integration**: Cockpit web interface via cockpit.spawn API
- **System**: APT package manager (Debian/Ubuntu systems)

## Installation

### From Debian Package (Recommended)

```bash
# Download the latest release
wget https://github.com/halos-org/cockpit-apt/releases/latest/download/cockpit-apt_0.1.0-1_all.deb

# Install the package
sudo apt install ./cockpit-apt_0.1.0-1_all.deb

# Restart Cockpit
sudo systemctl restart cockpit
```

Then access Cockpit APT at `https://your-server:9090/apt`

### From Source

```bash
# Clone repository
git clone https://github.com/halos-org/cockpit-apt.git
cd cockpit-apt

# Build frontend
cd frontend && npm install && npm run build && cd ..

# Install backend (creates cockpit-apt-bridge command)
cd backend && pip install -e . && cd ..

# Copy frontend to Cockpit directory
sudo mkdir -p /usr/share/cockpit/apt
sudo cp -r frontend/dist/* /usr/share/cockpit/apt/

# Restart Cockpit
sudo systemctl restart cockpit
```

## Requirements

### Runtime Requirements
- **OS**: Debian 12+ (Bookworm) or Ubuntu 22.04+ (Jammy)
- **Cockpit**: Version 276 or later
- **Python**: 3.11 or later with python-apt
- **Node.js**: Not required for runtime (only for building from source)

### Development Requirements
- **Docker**: For backend development
- **Node.js**: 18+ for frontend development
- See [Development Environment](#development-environment) below

## Development Environment

### Agentic Coding Setup (Claude Code, GitHub Copilot, etc.)

For development with AI assistants, use the halos workspace for full context:

```bash
# Clone the workspace
git clone https://github.com/halos-org/halos.git
cd halos

# Get all sub-repositories including cockpit-apt
./run repos:clone

# Work from workspace root for AI-assisted development
# Claude Code gets full context across all repos
```

See `halos/docs/` for development workflows:
- `LIFE_WITH_CLAUDE.md` - Quick start guide
- `IMPLEMENTATION_CHECKLIST.md` - Development checklist
- `DEVELOPMENT_WORKFLOW.md` - Detailed workflows

### Traditional Development Setup

This project uses Docker containers for development to ensure consistent environments across macOS and Linux. The container provides:

- Debian Trixie base (matches deployment target)
- Python 3.11+ with python-apt
- All development tools (uv, ruff, pyright, pytest)

### Option 1: Command Line (All Platforms)

No local Python installation required - all commands run in Docker:

```bash
# First time: Build the development container
./run docker:build

# Run backend tests
./run test

# Run linter
./run lint

# Type checking
./run typecheck

# Open interactive shell
./run shell

# Clean build artifacts
./run clean
```

### Pre-commit Hooks

This project uses [lefthook](https://github.com/evilmartians/lefthook) for pre-commit hooks to run lint checks locally before commits.

```bash
# Install lefthook (one-time)
brew install lefthook

# Enable hooks in this repo
./run hooks-install
```

**What it checks:**

- `ruff check` (backend) - Python linting
- `npm run lint` (frontend) - TypeScript linting

**Skip hooks when needed:**

```bash
git commit --no-verify -m "WIP: message"
```

### Option 2: VSCode Dev Container (Recommended for IDE Users)

Full IDE integration with Pylance, debugging, and extensions inside the container:

1. **Install prerequisites**:
   - [VSCode](https://code.visualstudio.com/)
   - [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
   - [Docker Desktop](https://www.docker.com/products/docker-desktop)

2. **Open in container**:
   - Open this directory in VSCode
   - Click "Reopen in Container" when prompted
   - Or: Command Palette → "Dev Containers: Reopen in Container"

3. **Start developing**:
   - Terminal runs in container automatically
   - Pylance sees real python-apt library
   - Run `uv run pytest` directly
   - Debugging works out of the box

### Backend Commands

```bash
# Testing
./run test                # Run all tests
./run test -v             # Verbose output
./run test -k search      # Run specific tests

# Code quality
./run lint                # Check code style
./run lint:fix            # Fix issues automatically
./run format              # Format code
./run typecheck           # Type checking

# Development
./run shell               # Interactive shell
./run build               # Build package
./run install:dev         # Install in dev mode
```

### Frontend Commands

Frontend development runs natively (requires Node.js 18+):

```bash
cd frontend

# First time setup
npm install

# Development
npm run build             # Build once
npm run watch             # Rebuild on changes
npm run typecheck         # Type checking
npm run lint              # Lint code
npm run test              # Run unit tests
npm run test:e2e          # Run E2E tests (requires test server)
npm run test:e2e:ui       # Run E2E tests in UI mode
```

Or use the convenience commands:

```bash
./run frontend:build
./run frontend:watch
./run frontend:typecheck
./run frontend:lint
./run frontend:test
```

## Quick Start

### 1. Setup

```bash
# Clone repository
git clone https://github.com/halos-org/cockpit-apt.git
cd cockpit-apt

# Build Docker development environment
./run docker:build

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Verify Backend

```bash
# Run backend tests
./run test

# If tests pass, backend is ready!
```

### 3. Build Frontend

```bash
# Build frontend once
./run frontend:build

# Or watch for changes during development
./run frontend:watch
```

### 4. Test in Cockpit

```bash
# Copy to Cockpit directory
sudo mkdir -p /usr/share/cockpit/apt
sudo cp -r frontend/dist/* /usr/share/cockpit/apt/

# Open Cockpit in browser
# Navigate to: http://localhost:9090/apt
```

## Project Structure

```
cockpit-apt/
├── backend/                  # Python backend
│   ├── cockpit_apt/          # Main package
│   │   ├── cli.py            # CLI entry point
│   │   ├── commands/         # Command handlers
│   │   │   └── search.py     # Search command
│   │   └── utils/            # Utilities
│   │       ├── errors.py     # Error handling
│   │       └── formatters.py # JSON formatting
│   ├── tests/                # Backend tests
│   ├── pyproject.toml        # Python dependencies
│   └── pyrightconfig.json    # Type checking config
├── frontend/                 # TypeScript/React frontend
│   ├── src/
│   │   ├── lib/              # TypeScript libraries
│   │   │   ├── types.ts      # Type definitions
│   │   │   └── apt-wrapper.ts # Backend API wrapper
│   │   ├── apt.tsx           # Main React component
│   │   ├── index.html        # HTML entry point
│   │   └── manifest.json     # Cockpit manifest
│   ├── package.json          # Node.js dependencies
│   └── tsconfig.json         # TypeScript config
├── docker/                   # Development containers
│   ├── Dockerfile.devtools   # Dev environment image
│   └── docker-compose.devtools.yml
├── .devcontainer/            # VSCode Dev Container config
│   └── devcontainer.json
├── views/                    # Custom view definitions
├── debian/                   # Debian packaging
└── run                       # Development script
```

## Testing

### Backend Tests

```bash
# Run all tests with coverage
./run test

# Verbose output
./run test -v

# Run specific test file
./run test tests/test_search.py

# Run tests matching pattern
./run test -k "search"

# Stop on first failure
./run test -x
```

### Frontend Tests

**Unit Tests** (vitest):
```bash
cd frontend
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

**E2E Tests** (Playwright):
```bash
cd frontend

# First time: install browsers
npx playwright install chromium

# Run E2E tests
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Interactive UI mode
```

**Note**: E2E tests require a running Cockpit instance at `https://halos.local:9090` with the cockpit-apt module installed. See [frontend/E2E_TESTING.md](frontend/E2E_TESTING.md) for detailed setup instructions.

## Code Quality

### Backend

```bash
./run lint                # Check issues
./run lint:fix            # Auto-fix issues
./run format              # Format code
./run typecheck           # Type checking
```

### Frontend

```bash
cd frontend
npm run lint              # ESLint
npm run typecheck         # TypeScript check
npm run format            # Prettier format
```

## Continuous Integration

Run all CI checks locally before pushing:

```bash
# Run all tests
./run ci:test

# Run all linters and type checkers
./run ci:lint

# Or individually
./run test && ./run frontend:test
./run lint && ./run typecheck && ./run frontend:lint && ./run frontend:typecheck
```

## Known Limitations

### Current Limitations
- **Package Upgrades**: Individual package upgrades not yet supported (use `apt upgrade` from terminal)
- **Repository Management**: Cannot add/remove APT repositories through the UI
- **Unattended Upgrades**: No configuration UI for automatic updates
- **AppStream Integration**: Package icons and screenshots not yet displayed (planned for future release)

### Performance Notes
- **Large Package Lists**: Sections with 1000+ packages may load slowly
- **Search**: Results limited to 100 packages for performance
- **File Lists**: Very large packages (10,000+ files) may take time to display

### Known Issues
- **pytest Cleanup Warning**: Backend tests show harmless file descriptor cleanup warning (tests all pass)
- **Package List Refresh**: After install/remove, manually refresh browser to update package lists in other tabs

## Troubleshooting

### User Issues

**"APT" doesn't appear in Cockpit menu**:
- Verify cockpit-apt is installed: `dpkg -l | grep cockpit-apt`
- Check files exist: `ls /usr/share/cockpit/apt/`
- Restart Cockpit: `sudo systemctl restart cockpit`
- Check Cockpit logs: `journalctl -u cockpit.service -n 50`

**"Package manager is locked" error**:
- Another package manager (apt, aptitude, synaptic) is running
- Wait for the other operation to complete, or:
- Check for background updates: `ps aux | grep apt`
- If safe to do so: `sudo killall apt apt-get`

**"Unable to locate package" error**:
- Package name misspelled
- Package not available in your repositories
- Run "Update" to refresh package lists
- Check `/etc/apt/sources.list` configuration

**Install/Remove hangs or times out**:
- Large packages may take several minutes
- Check network connection for package downloads
- Monitor progress in terminal: `sudo tail -f /var/log/apt/term.log`

**Permission denied errors**:
- Ensure you're logged into Cockpit with admin credentials
- User must be in `sudo` group: `groups username`
- Check Cockpit allows administrative access

### Developer Issues

**Import errors for python-apt on macOS**:
- This is expected! Use `./run test` which runs in Docker container
- Or use VSCode Dev Container for full IDE support

**Tests fail with "apt module not found"**:
```bash
# Rebuild Docker image
./run docker:build

# Verify container works
./run shell
python3 -c "import apt; print('OK')"
```

**Type checking errors**:
```bash
./run typecheck
```

**Module not found errors (frontend)**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Build fails**:
```bash
cd frontend
npm run build
# Check console for specific errors
```

**Cockpit doesn't load module**:
- Check manifest.json is valid JSON
- Verify files are in /usr/share/cockpit/apt/
- Check browser console (F12) for JavaScript errors
- Restart cockpit.service: `sudo systemctl restart cockpit`

**Docker container won't start**:
```bash
# Clean and rebuild
./run docker:clean
./run docker:build
```

**Permission errors in container**:
```bash
# Check user ID mapping
docker compose -f docker/docker-compose.devtools.yml run --rm devtools id
```

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork and clone** the repository
2. **Create a feature branch**: `git checkout -b feat/my-feature`
3. **Make your changes** following the coding standards
4. **Run all tests**: `./run test && ./run frontend:test`
5. **Run linters**: `./run lint && ./run frontend:lint`
6. **Type check**: `./run typecheck && ./run frontend:typecheck`
7. **Commit**: Use conventional format `feat(scope): description`
8. **Create PR**: Target the `main` branch
9. **Wait for CI**: All checks must pass (includes GitHub Copilot review)

See [CLAUDE.md](CLAUDE.md) for detailed development workflow and guidelines.

## Documentation

### User Documentation
- **README.md** (this file) - Installation, usage, and troubleshooting
- **[E2E_TESTING.md](frontend/E2E_TESTING.md)** - End-to-end testing guide

### Developer Documentation
- **[CLAUDE.md](CLAUDE.md)** - Development guide and project context
- **[STATE.md](STATE.md)** - Implementation status (94% complete)
- **[TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md)** - Technical specification
- **[PROJECT_PLAN.md](docs/PROJECT_PLAN.md)** - Implementation roadmap

### Task Documentation
- [TASK_01_INFRASTRUCTURE.md](docs/TASK_01_INFRASTRUCTURE.md) - Project infrastructure
- [TASK_02_PYTHON_BACKEND.md](docs/TASK_02_PYTHON_BACKEND.md) - Backend implementation
- [TASK_03_TYPESCRIPT_WRAPPER.md](docs/TASK_03_TYPESCRIPT_WRAPPER.md) - TypeScript API
- [TASK_04_UI_COMPONENTS.md](docs/TASK_04_UI_COMPONENTS.md) - UI components
- [TASK_06_OPERATIONS.md](docs/TASK_06_OPERATIONS.md) - Operations testing

## Project Status

**Version**: 0.1.0 (Beta)
**Status**: 94% complete - Core functionality implemented and tested

**Completed**:
- ✅ All backend commands (12 commands, 89% test coverage)
- ✅ Full UI with 6 views (Sections, Search, Installed, Updates, Details, Section Packages)
- ✅ Package operations (install, remove, update)
- ✅ Safety features (essential package protection, input validation)
- ✅ Comprehensive testing (285 total tests: 129 backend + 156 frontend)
- ✅ E2E testing infrastructure (25 Playwright tests)

**In Progress**:
- ⏳ Manual testing scenarios
- ⏳ Cache invalidation verification
- ⏳ Final documentation polish

**Planned for Future Releases**:
- 📋 Individual package upgrade support
- 📋 Repository management UI
- 📋 AppStream metadata (icons, screenshots)
- 📋 Unattended upgrade configuration

## License

GNU Lesser General Public License v2.1 - see [LICENSE](LICENSE) file for details.

## Related Projects

- **[Cockpit Project](https://cockpit-project.org/)** - Web-based server administration
- **[python-apt](https://apt-team.pages.debian.net/python-apt/)** - Python interface to APT
- **[PatternFly](https://www.patternfly.org/)** - Enterprise UI design system
- **[HaLOS](https://github.com/halos-org/halos)** - Hat Labs Operating System (parent project)

## Support

- **Issues**: [GitHub Issues](https://github.com/halos-org/cockpit-apt/issues)
- **Discussions**: [GitHub Discussions](https://github.com/halos-org/cockpit-apt/discussions)
- **Documentation**: See links above

---

Made with ❤️ by Hat Labs • Part of the [HaLOS](https://github.com/halos-org/halos) ecosystem
