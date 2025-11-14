# ADR-001: Container Store Architecture

**Status**: Accepted
**Date**: 2025-11-11
**Updated**: 2025-11-11
**Deciders**: HatLabs Team

## Context

HaLOS development aims to make Cockpit the primary admin interface, eliminating the need for additional tools like Runtipi. The vision is to package all container applications as native Debian packages and manage them through standard APT tooling.

Cockpit's built-in package management (Software Updates) only handles system updates, not application discovery and installation. The cockpit-apt module provides full APT package management, but lacks specialized views for container applications that users expect from container app stores (rich metadata, screenshots, categorization).

### Current State
- Container apps managed via Runtipi (separate web interface)
- Users must learn and navigate two different admin interfaces
- Debian package metadata limited to package descriptions
- No visual discovery of available Debian container applications

### Desired State
- Single unified admin interface (Cockpit)
- Container apps packaged as .deb files in APT repository
- Rich application metadata (icons, screenshots, descriptions)
- Specialized "store" views for different package categories
- Extensible architecture supporting multiple stores beyond containers

## Decision

We will implement an extensible "store" architecture in cockpit-apt that allows filtering and specialized presentation of package subsets.

### Core Architecture

**1. Package Tagging**
- Use Debian's faceted tag system (debtags) for rich categorization
- Tags follow debtags vocabulary with facets:
  - `role::container-app` - Identifies as a container application
  - `field::marine` - Domain/application field
  - `interface::web` - Has web interface
  - `use::organizing`, `use::monitoring` - Purpose/function
- Packages can have multiple tags, enabling them to appear in multiple stores
- Example: `Tag: role::container-app, field::marine, interface::web, use::monitoring`
- Standard Debian sections still apply for base categorization

**2. Store Definition Packages**
- Each store is defined by a dedicated .deb package
- Package naming: `<store-id>-container-store` (e.g., `marine-container-store`)
- Installs store configuration to `/etc/container-apps/stores/<store-id>.yaml`
- Installs branding assets to `/usr/share/container-stores/<store-id>/`
- Store config defines filters (which packages belong to this store)
- Store config defines custom section metadata and labels
- Format: YAML (supports comments for maintainability)

**3. Runtime: Docker Compose**
- Use Docker Compose as the container orchestration format
- No auto-conversion to Podman pods (keep it simple)
- Compose files are the standard, widely-understood format
- Future: Could add Podman support alongside Docker

**4. Package Structure**
Each container app package installs:
- Package naming: `<upstream-name>-container` (e.g., `signalk-server-container`)
- Compose file: `/var/lib/container-apps/<package>/docker-compose.yml`
- Environment template: `/var/lib/container-apps/<package>/.env.template`
- App metadata: `/var/lib/container-apps/<package>/metadata.json`
- App config: `/etc/container-apps/<package>/config.yml`
- systemd service: `/etc/systemd/system/<name>-container.service`

**5. Lifecycle Management**
- systemd manages container apps (not Docker's built-in orchestration)
- Service units call `docker compose up/down` in package directory
- Benefits: consistent management, integration with system logging, dependency handling
- Example service: `signalk-container.service` manages Signal K container

**6. AppStream Integration**
- AppStream metadata embedded in .deb packages
- Icons and screenshots hosted in apt.hatlabs.fi repository
- Backend parses AppStream XML from installed packages
- Frontend displays rich metadata in store views

**7. UI Integration**

Two-level filtering hierarchy providing fine-grained package discovery:

**Store Toggle Group** (when stores installed):
- Button group showing "System" + installed store names
- Hidden by default (vanilla cockpit-apt with no stores)
- Appears when 1+ store packages installed
- Alphabetical ordering of stores
- Active selection filters all content below

**Repository Dropdown** (always present):
- Dropdown showing "Repository: All" + configured APT sources
- Uses repository `Origin:` or `Label:` field for human-readable names
- Context-sensitive: filtered by active store selection
- Hidden if only 1 repository configured
- Alphabetical ordering of repositories

**UI Hierarchy**:
```
┌─────────────────────────────────────────────────────┐
│ [System] [Marine Apps] [Dev Tools]  ← Store Toggle  │
│ [Repository: All ▼]                  ← Repo Dropdown │
│ Browse | Search | Installed | Updates ← Tabs         │
│                                                       │
│ [Content: sections/packages/etc.]                    │
└─────────────────────────────────────────────────────┘
```

**Filter Cascade**:
1. Store selection determines eligible packages (by tags, origins, sections)
2. Repository dropdown filters within that set (by origin)
3. Tabs show filtered results
4. Content displays packages matching all filters

**Benefits**:
- Repository filtering useful even without stores (vanilla mode)
- Users can identify package sources (trust, troubleshooting)
- Fine-grained control: store + repo combinations
- Progressive enhancement: works without stores, better with them

### Example: Marine Container Store

**Store Definition Package**: `marine-container-store`

Installs `/etc/container-apps/stores/marine.yaml`:
```yaml
id: marine
name: Marine Navigation & Monitoring
description: |
  Applications for marine navigation, monitoring, and boat systems.
  Includes chart plotters, data loggers, and marine-specific integrations.

icon: /usr/share/container-stores/marine/icon.svg
banner: /usr/share/container-stores/marine/banner.png

filters:
  include_origins:       # All packages from Hat Labs repo
    - "Hat Labs"
  include_sections:      # Standard Debian sections
    - net
    - web
  include_tags:          # Packages with marine tags (any repo)
    - field::marine
  include_packages:      # Explicit additions (e.g., from Debian)
    - influxdb-container
    - grafana-container

section_metadata:
  net:
    label: Navigation & Communication
    icon: anchor
    description: Marine networking and communication services
  web:
    label: Web Services
    icon: globe
    description: Web-based dashboards and interfaces
  ais:  # Custom section not in standard Debian
    label: AIS & Radar
    icon: radar
    description: AIS receivers and radar integration
```

**Filter Logic**: Package is included if it matches ANY of:
- Origin is "Hat Labs" (all Hat Labs packages)
- Section is "net" or "web" (from any repo)
- Has tag `field::marine` (from any repo)
- Explicitly listed (influxdb-container, grafana-container)

This allows mixing:
- Curated apps from apt.hatlabs.fi (origin)
- Generic marine apps from other repos (tags)
- Essential dependencies from Debian (explicit packages)

**Container App Package**: `signalk-server-container`
```
Package: signalk-server-container
Section: net
Tag: role::container-app, field::marine, interface::web, use::monitoring
Description: Signal K marine data server
 Modern boat data hub for sensors and marine electronics.
 Acts as a central nervous system for your boat, collecting data
 from all sensors and making it available to navigation software.
```

**Installed Files**:
```
/var/lib/container-apps/signalk-server-container/
  ├── docker-compose.yml
  ├── .env.template
  └── metadata.json

/etc/container-apps/signalk-server-container/
  └── config.yml

/etc/systemd/system/
  └── signalk-server-container.service

/usr/share/metainfo/
  └── io.signalk.SignalK.metainfo.xml  # AppStream (optional)
```

## Consequences

### Positive
- **Unified Interface**: Single admin interface for all system management
- **Native Integration**: Container apps managed like system packages
- **Extensible**: Architecture supports multiple stores (containers, plugins, themes, etc.)
- **Standard Tools**: Uses APT, systemd - familiar to sysadmins
- **Rich Metadata**: AppStream provides app store-quality presentation
- **Flexibility**: Packages can belong to multiple stores via tags

### Negative
- **Docker Dependency**: Requires Docker to be installed and running
- **Package Overhead**: Each container app needs Debian packaging
- **Limited Isolation**: systemd + Docker, not full orchestration platform
- **Learning Curve**: Package maintainers need to learn .deb packaging

### Neutral
- **Docker Compose Only**: Simple but not supporting other runtimes yet
- **AppStream in .deb**: Simpler than separate repo component, but larger packages
- **systemd Management**: More control than Docker's orchestration, but requires service files

## Package Generation Workflow

To simplify the creation of container app packages, we provide tooling that generates Debian packages from simple app definitions.

### Container Definitions Repository

Container apps are defined in dedicated repositories (e.g., `halos-marine-containers`):

```
halos-marine-containers/
├── apps/
│   ├── signalk-server/
│   │   ├── docker-compose.yml
│   │   ├── config.yml
│   │   ├── metadata.json
│   │   └── icon.png
│   ├── opencpn/
│   └── ...
├── .github/workflows/
│   └── build.yml  # CI/CD to build .debs
└── README.md
```

### Packaging Tools

The `container-packaging-tools` package provides:
- `/usr/bin/generate-container-packages` - Command to generate .deb packages
- `/usr/share/container-packaging-tools/templates/` - Debian package templates
- `/usr/share/container-packaging-tools/schemas/` - Validation schemas

**Usage**:
```bash
generate-container-packages apps/ output/
# Generates output/signalk-server-container/, output/opencpn-container/, etc.
```

### Build Pipeline

1. Developer adds new app definition to `apps/` directory
2. Commits and pushes to repository
3. CI/CD (GitHub Actions) runs on push:
   - Validates app definitions against schemas
   - Runs `generate-container-packages`
   - Builds .deb packages
   - Publishes to apt.hatlabs.fi

### Benefits

- Package maintainers don't need to understand Debian packaging internals
- Consistent package structure across all container apps
- CI/CD ensures quality and automates publishing
- Easy to add new apps with minimal boilerplate

## Implementation Notes

### Phase 1: Container Store Foundation (Current)
**Goal**: Establish container app packaging and store infrastructure

Components:
- [ ] `container-packaging-tools` - Generate .deb packages from app definitions
- [ ] `halos-marine-containers` - First container app definitions repository
- [ ] `marine-container-store` - Store definition package
- [ ] cockpit-apt enhancements:
  - [ ] Backend: Parse and expose debtags from packages
  - [ ] Backend: Parse repository origin/label from package sources
  - [ ] Backend: Filter packages by tags, origins, sections
  - [ ] Frontend: Store toggle group UI component (when stores installed)
  - [ ] Frontend: Repository dropdown UI component (always present)
  - [ ] Frontend: Store-specific section metadata display
  - [ ] Configuration: Load store definitions from `/etc/container-apps/stores/`
  - [ ] Repository detection: Enumerate configured APT sources with available packages

Success criteria:
- 3-5 working marine container apps
- Store filter working in cockpit-apt UI
- Users can install/remove container apps
- systemd services start containers automatically

### Phase 2: Container Configuration UI
**Goal**: Separate Cockpit module for managing and configuring installed container apps

Components:
- [ ] `cockpit-container-config` - Standalone Cockpit module (separate from cockpit-apt):
  - Appears in Cockpit's left sidebar navigation (like Services, Logs, Storage modules)
  - Interface similar to cockpit-apt and built-in modules (PatternFly components)
  - [ ] List view of all installed container apps with status indicators
  - [ ] Configuration editor for config.yml files
  - [ ] Service control (start/stop/restart via systemd)
  - [ ] Real-time log viewer (journalctl integration)
  - [ ] Links to web UIs for apps that provide them

### Phase 3: Expansion & Polish
**Goals**: More apps, converters, additional stores

- [ ] Converter tools (CasaOS, Runtipi imports)
- [ ] Additional container definition repos
- [ ] Additional store packages
- [ ] 20+ container apps available

### Phase 4: Future Enhancements
- [ ] Container resource usage display in cockpit-apt
- [ ] Podman support alongside Docker
- [ ] Additional stores (development, home automation, etc.)
- [ ] WiFi configuration tool
- [ ] Submit cockpit-apt to Debian/Ubuntu upstream

## Alternatives Considered

### Alternative 1: Keep Runtipi
**Rejected because**: Requires separate web interface, duplicates functionality, less integrated with system. Runtipi uses a 4-container orchestration stack that adds complexity.

### Alternative 2: Simple `store::` Tags Instead of Debtags
**Rejected because**: Debian's faceted tag system (debtags) provides much richer categorization. Using standard debtags vocabulary ensures:
- Better integration with Debian ecosystem
- Packages can appear in multiple stores naturally via multiple tags
- More detailed filtering capabilities (by role, field, interface, use)
- Future-proof as debtags vocabulary expands

Example: `Tag: role::container-app, field::marine, interface::web` is more expressive than `Tag: store::marine`.

### Alternative 3: Config Files in `/etc/cockpit-apt/` Instead of Store Packages
**Rejected because**: Store definition packages provide:
- Easy installation on vanilla Raspberry Pi OS
- Versioning and updates via APT
- Branding assets bundled with configuration
- Clear dependency management

### Alternative 4: Podman Pods
**Rejected for now because**: Docker Compose is more widely known and documented. Podman support can be added later without architectural changes.

### Alternative 5: Separate AppStream Repository Component
**Rejected because**: Embedding in .deb is simpler for initial implementation. Can migrate to separate component if packages become too large.

### Alternative 6: Paths in `/opt/` Instead of `/var/lib/`
**Rejected because**: Following Filesystem Hierarchy Standard (FHS):
- `/var/lib/` is for variable state data
- `/etc/` is for configuration
- `/opt/` is for self-contained third-party software
Container apps are system-managed packages, so standard paths are more appropriate.

### Alternative 7: No Repository Filtering
**Rejected because**: Repository filtering adds significant value even without stores:
- Helps users identify package sources (trust, troubleshooting)
- Useful for vanilla cockpit-apt installations
- Natural complement to store filtering
- Minimal additional complexity in UI and backend

**Design decision**: Use `Origin:` field (preferred) or `Label:` field from APT repository Release file for human-readable names. Origin typically provides cleaner names (e.g., "Debian", "Hat Labs") while Label may be more technical (e.g., "debian", "hatlabs").

## References

- [Debian Package Tags (Debtags)](https://wiki.debian.org/Debtags) - Overview of Debian's package tagging system
- [Debtags FAQ](https://wiki.debian.org/Debtags/FAQ) - Common questions about debtags usage
- [Debtags Vocabulary](https://salsa.debian.org/debtags-team/debtags-vocabulary/raw/master/debian-packages) - Complete tag vocabulary with facets
- [Debian Policy Manual](https://www.debian.org/doc/debian-policy/) - Packaging standards
- [AppStream Documentation](https://www.freedesktop.org/software/appstream/docs/) - Application metadata format
- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/) - Container orchestration
- [systemd Service Units](https://www.freedesktop.org/software/systemd/man/systemd.service.html) - Service management
- [Filesystem Hierarchy Standard](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html) - Linux directory structure
- [Cockpit Developer Guide](https://cockpit-project.org/guide/latest/) - Building Cockpit modules

## Related Documents

- [../../META-PLANNING.md](../../META-PLANNING.md) - Workspace-level planning and architecture decisions
- [../../PROJECT_PLANNING_GUIDE.md](../../PROJECT_PLANNING_GUIDE.md) - Development workflow for component repositories
- [SPEC.md](SPEC.md) - Technical specification (to be created when implementation begins)
- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed system architecture (to be created when implementation begins)
