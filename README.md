# Cockpit APT

Modern APT package manager interface for Cockpit, inspired by Raspberry Pi's Add/Remove Software.

## Features

- **Browse by Debian sections**: Navigate packages organized by category (games, web, development, etc.)
- **Search functionality**: Fast package search by name and description
- **Package details**: View comprehensive information including dependencies and reverse dependencies
- **Install/Remove**: One-click package operations with progress tracking
- **Modern UI**: Clean PatternFly-based interface integrated into Cockpit

## Architecture

- **Backend**: Python 3.11+ using python-apt library
- **Frontend**: React 18 + TypeScript with PatternFly 6
- **Integration**: Cockpit web interface via cockpit.spawn API
- **System**: APT package manager (Debian/Ubuntu systems)

## Development Environment

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
git clone https://github.com/hatlabs/cockpit-apt.git
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
│   ├── cockpit_apt_bridge/   # Main package
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

## Troubleshooting

### Backend Issues

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

### Frontend Issues

**Module not found errors**:
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

### Docker Issues

**Container won't start**:
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

1. Make changes in a feature branch
2. Run tests: `./run test && ./run frontend:test`
3. Run linters: `./run lint && ./run frontend:lint`
4. Ensure type checking passes: `./run typecheck && ./run frontend:typecheck`
5. Commit using conventional commit format: `feat(search): add sorting`
6. Open pull request

## Documentation

- [CLAUDE.md](CLAUDE.md) - Development guide and project memory
- [TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md) - Technical specification
- [PROJECT_PLAN.md](docs/PROJECT_PLAN.md) - Implementation roadmap
- [TASK_01_INFRASTRUCTURE.md](docs/TASK_01_INFRASTRUCTURE.md) - Infrastructure setup details

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [Cockpit Project](https://cockpit-project.org/) - Web-based server administration
- [python-apt](https://apt-team.pages.debian.net/python-apt/) - Python interface to APT
- [PatternFly](https://www.patternfly.org/) - Enterprise UI design system

Part of the [HaLOS](https://github.com/hatlabs/halos-distro) ecosystem.
