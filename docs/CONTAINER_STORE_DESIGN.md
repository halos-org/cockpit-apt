# Cockpit APT - Container Store Design

**Status**: Draft
**Date**: 2025-11-11
**Last Updated**: 2025-11-11

## Overview

This document describes the container store filtering and repository management features for cockpit-apt. These enhancements enable cockpit-apt to present curated "stores" of container applications while maintaining full functionality as a general-purpose APT package manager.

## Purpose

- Enable curated package stores (marine apps, dev tools, etc.)
- Provide repository filtering capabilities
- Maintain compatibility as vanilla APT manager
- Support multiple concurrent stores
- Integrate seamlessly with existing cockpit-apt UI

## Design Principles

1. **Progressive Enhancement**: Store features are hidden when no store packages installed
2. **Vanilla Compatible**: Works as standard APT manager without store packages
3. **Upstream Friendly**: Designed for potential inclusion in Debian/Ubuntu
4. **User Control**: Repository filtering useful even without stores
5. **Non-Intrusive**: Stores don't interfere with system package management

## UI Architecture

### UI Hierarchy

```
┌──────────────────────────────────────────────────────────┐
│ Cockpit APT - Software Management                         │
├──────────────────────────────────────────────────────────┤
│ [System] [Marine Apps] [Dev Tools]  ← Store Toggle Group │
│ [Repository: All ▼]                  ← Repository Filter │
│ Browse | Search | Installed | Updates ← Existing Tabs    │
│                                                            │
│ [Content: Package lists, sections, etc.]                  │
└──────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
<SoftwarePage>
  ├── <StoreToggleGroup>       (new, conditional)
  ├── <RepositoryDropdown>     (new, always present)
  └── <Tabs>                   (existing)
      ├── <BrowseTab>
      │   ├── <SectionGrid>
      │   └── <PackageList>
      ├── <SearchTab>
      │   └── <PackageList>
      ├── <InstalledTab>
      │   └── <PackageList>
      └── <UpdatesTab>
          └── <PackageList>
```

## Store Toggle Group

### Purpose

Allows users to switch between "System" (all packages) and installed store views (filtered packages).

### Behavior

**Visibility**:
- Hidden when NO store packages installed
- Shows when 1+ store packages installed
- Occupies minimal space (single row of toggle buttons)

**Options**:
- "System" (always present) - shows all packages
- Installed store names (alphabetical) - shows filtered packages

**Selection**:
- Single selection (radio button behavior)
- Persists across sessions (localStorage)
- Defaults to "System" on first visit

### Implementation

**Component**: `StoreToggleGroup.tsx`

```typescript
interface Store {
  id: string;
  name: string;
  icon?: string;
  description: string;
}

interface StoreToggleGroupProps {
  stores: Store[];
  activeStore: string | null;  // null = "System"
  onStoreChange: (storeId: string | null) => void;
}

export const StoreToggleGroup: React.FC<StoreToggleGroupProps> = ({
  stores,
  activeStore,
  onStoreChange
}) => {
  // Don't render if no stores installed
  if (stores.length === 0) {
    return null;
  }

  return (
    <ToggleGroup>
      <ToggleGroupItem
        text="System"
        isSelected={activeStore === null}
        onChange={() => onStoreChange(null)}
      />
      {stores.map(store => (
        <ToggleGroupItem
          key={store.id}
          text={store.name}
          isSelected={activeStore === store.id}
          onChange={() => onStoreChange(store.id)}
        />
      ))}
    </ToggleGroup>
  );
};
```

**PatternFly Component**: `ToggleGroup` with `ToggleGroupItem`

**State Management**:
```typescript
const [activeStore, setActiveStore] = useState<string | null>(
  localStorage.getItem('cockpit-apt.activeStore') || null
);

const handleStoreChange = (storeId: string | null) => {
  setActiveStore(storeId);
  localStorage.setItem('cockpit-apt.activeStore', storeId || '');
  // Trigger package list refresh with new filter
  refreshPackages();
};
```

## Repository Dropdown

### Purpose

Filters packages by repository origin, useful for both vanilla and store modes.

### Behavior

**Visibility**:
- Always present (even without stores)
- Hidden if only 1 repository configured

**Options**:
- "All" (default) - shows packages from all repositories
- Repository names (alphabetical) - from APT Release file Origin/Label

**Context-Sensitive**:
- When store selected: Shows only repos that have packages in that store
- When "System" selected: Shows all configured repositories

**Selection**:
- Single selection (dropdown)
- Persists across sessions (localStorage)
- Defaults to "All"

### Implementation

**Component**: `RepositoryDropdown.tsx`

```typescript
interface Repository {
  id: string;           // Unique identifier (origin + suite)
  name: string;         // Display name (from Origin or Label)
  origin: string;       // Origin field from Release file
  suite: string;        // Suite/codename (bookworm, jammy, etc.)
  packageCount: number; // Number of packages (filtered by active store)
}

interface RepositoryDropdownProps {
  repositories: Repository[];
  activeRepo: string | null;  // null = "All"
  activeStore: string | null;
  onRepoChange: (repoId: string | null) => void;
}

export const RepositoryDropdown: React.FC<RepositoryDropdownProps> = ({
  repositories,
  activeRepo,
  activeStore,
  onRepoChange
}) => {
  // Filter repos by active store (show only repos with packages in store)
  const filteredRepos = useMemo(() => {
    if (!activeStore) return repositories;
    return repositories.filter(repo => repo.packageCount > 0);
  }, [repositories, activeStore]);

  // Hide if only 1 repo
  if (filteredRepos.length <= 1) {
    return null;
  }

  return (
    <Dropdown
      toggle={<DropdownToggle>Repository: {getRepoName(activeRepo)}</DropdownToggle>}
      isOpen={isOpen}
      onSelect={(event, selection) => onRepoChange(selection as string)}
    >
      <DropdownItem key="all" onClick={() => onRepoChange(null)}>
        All Repositories
      </DropdownItem>
      <Divider />
      {filteredRepos.map(repo => (
        <DropdownItem key={repo.id} onClick={() => onRepoChange(repo.id)}>
          {repo.name} ({repo.packageCount} packages)
        </DropdownItem>
      ))}
    </Dropdown>
  );
};
```

**PatternFly Components**: `Dropdown`, `DropdownToggle`, `DropdownItem`

**State Management**:
```typescript
const [activeRepo, setActiveRepo] = useState<string | null>(
  localStorage.getItem('cockpit-apt.activeRepo') || null
);

const handleRepoChange = (repoId: string | null) => {
  setActiveRepo(repoId);
  localStorage.setItem('cockpit-apt.activeRepo', repoId || '');
  // Trigger package list refresh with new filter
  refreshPackages();
};
```

## Filter Cascade Logic

### Flow

1. **Store Selection** determines eligible packages
2. **Repository Filter** filters within eligible set
3. **Tab Selection** (Browse/Search/Installed/Updates) shows filtered results
4. **Content Area** displays final filtered package list

### Filter Application

```typescript
interface FilterState {
  activeStore: string | null;   // null = System (no filter)
  activeRepo: string | null;    // null = All repos
  searchQuery: string;          // Search text
  activeTab: 'browse' | 'search' | 'installed' | 'updates';
}

function filterPackages(
  allPackages: Package[],
  filters: FilterState,
  storeConfigs: StoreConfig[]
): Package[] {
  let filtered = allPackages;

  // 1. Apply store filter (if active)
  if (filters.activeStore) {
    const storeConfig = storeConfigs.find(s => s.id === filters.activeStore);
    filtered = filtered.filter(pkg => matchesStoreFilter(pkg, storeConfig));
  }

  // 2. Apply repository filter (if active)
  if (filters.activeRepo) {
    filtered = filtered.filter(pkg => pkg.origin === filters.activeRepo);
  }

  // 3. Apply tab-specific filters
  switch (filters.activeTab) {
    case 'installed':
      filtered = filtered.filter(pkg => pkg.isInstalled);
      break;
    case 'updates':
      filtered = filtered.filter(pkg => pkg.hasUpdate);
      break;
    case 'search':
      filtered = filtered.filter(pkg =>
        matchesSearch(pkg, filters.searchQuery)
      );
      break;
  }

  return filtered;
}
```

## Backend: Store Configuration

### Store Config Loading

**Location**: `/etc/container-apps/stores/*.yaml`

**Loading Process**:
1. Scan `/etc/container-apps/stores/` directory
2. Parse each `.yaml` file
3. Validate against schema
4. Cache in memory
5. Watch for changes (inotify)

**Python Backend** (`store_config.py`):

```python
import os
import yaml
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class StoreFilter:
    include_origins: List[str] = None
    include_sections: List[str] = None
    include_tags: List[str] = None
    include_packages: List[str] = None

@dataclass
class CustomSection:
    id: str
    label: str
    description: str
    icon: str

@dataclass
class StoreConfig:
    id: str
    name: str
    description: str
    icon: str
    banner: str
    filters: StoreFilter
    custom_sections: List[CustomSection]

def load_stores() -> List[StoreConfig]:
    """Load all store configurations from /etc/container-apps/stores/"""
    stores = []
    store_dir = Path('/etc/container-apps/stores')

    if not store_dir.exists():
        return []

    for store_file in store_dir.glob('*.yaml'):
        try:
            with open(store_file) as f:
                data = yaml.safe_load(f)
                store = parse_store_config(data)
                stores.append(store)
        except Exception as e:
            print(f"Error loading store {store_file}: {e}")

    return stores

def parse_store_config(data: Dict[str, Any]) -> StoreConfig:
    """Parse store YAML into StoreConfig object"""
    filters = StoreFilter(
        include_origins=data.get('filters', {}).get('include_origins', []),
        include_sections=data.get('filters', {}).get('include_sections', []),
        include_tags=data.get('filters', {}).get('include_tags', []),
        include_packages=data.get('filters', {}).get('include_packages', [])
    )

    custom_sections = [
        CustomSection(**section)
        for section in data.get('custom_sections', [])
    ]

    return StoreConfig(
        id=data['id'],
        name=data['name'],
        description=data['description'],
        icon=data['icon'],
        banner=data['banner'],
        filters=filters,
        custom_sections=custom_sections
    )
```

### Store Filter Matching

**Python Backend** (`store_filter.py`):

```python
def matches_store_filter(package: Package, store_config: StoreConfig) -> bool:
    """
    Check if package matches store filter criteria.
    Uses OR logic within categories, AND logic between categories.
    """
    filters = store_config.filters
    matches = []

    # Check origin filter (if specified)
    if filters.include_origins:
        origin_match = package.origin in filters.include_origins
        matches.append(origin_match)

    # Check section filter (if specified)
    if filters.include_sections:
        section_match = package.section in filters.include_sections
        matches.append(section_match)

    # Check tag filter (if specified)
    if filters.include_tags:
        tag_match = any(
            tag in package.tags
            for tag in filters.include_tags
        )
        matches.append(tag_match)

    # Check explicit package list (if specified)
    if filters.include_packages:
        package_match = package.name in filters.include_packages
        matches.append(package_match)

    # AND logic between categories: all must match
    # If no filters specified, package doesn't match
    if not matches:
        return False

    return all(matches)
```

## Backend: Debtag Parsing

### Debtag Sources

**Primary Source**: Package `Tag:` field in APT cache
**Format**: Comma-separated faceted tags
**Example**: `Tag: role::container-app, field::marine, interface::web`

### Parsing Implementation

**Python Backend** (`debtags.py`):

```python
import apt

def parse_package_tags(package: apt.Package) -> List[str]:
    """Extract and parse tags from package metadata"""
    if not package.candidate:
        return []

    record = package.candidate.record
    tag_field = record.get('Tag', '')

    if not tag_field:
        return []

    # Split by comma, strip whitespace
    tags = [tag.strip() for tag in tag_field.split(',')]

    return tags

def get_tag_facet(tag: str) -> tuple[str, str]:
    """Split tag into facet and value"""
    if '::' in tag:
        facet, value = tag.split('::', 1)
        return (facet, value)
    return ('', tag)

def filter_by_tags(packages: List[apt.Package], required_tags: List[str]) -> List[apt.Package]:
    """Filter packages by required tags (OR logic)"""
    filtered = []

    for package in packages:
        package_tags = parse_package_tags(package)

        # Package matches if it has ANY of the required tags
        if any(tag in package_tags for tag in required_tags):
            filtered.append(package)

    return filtered
```

### Debtag Facets Reference

Common facets for container apps:
- `role::` - Package role (container-app, plugin, library)
- `field::` - Application domain (marine, astronomy, finance)
- `interface::` - User interface type (web, commandline, x11)
- `use::` - Primary purpose (monitoring, organizing, routing)
- `network::` - Network role (server, client, service)
- `works-with::` - Data types handled (database, images, video)

**Full vocabulary**: https://salsa.debian.org/debtags-team/debtags-vocabulary

## Backend: Origin/Label Parsing

### APT Repository Metadata

**Source**: `/var/lib/apt/lists/*_Release` files

**Relevant Fields**:
- `Origin:` - Organization maintaining the repository
- `Label:` - Human-readable repository name
- `Suite:` - Distribution release (bookworm, jammy)
- `Codename:` - Release codename

**Example Release File**:
```
Origin: Hat Labs
Label: HaLOS Container Apps
Suite: stable
Codename: stable
Architectures: arm64 amd64
Components: main
Description: Marine and sailing container applications
```

### Parsing Implementation

**Python Backend** (`repository.py`):

```python
import apt_pkg
from pathlib import Path
from typing import List, Dict

@dataclass
class Repository:
    id: str
    name: str
    origin: str
    label: str
    suite: str
    components: List[str]

def parse_repositories() -> List[Repository]:
    """Parse repository metadata from APT lists"""
    apt_pkg.init()
    cache = apt.Cache()
    repos = {}

    for package in cache:
        if not package.candidate:
            continue

        for origin in package.candidate.origins:
            repo_id = f"{origin.origin}:{origin.suite}"

            if repo_id not in repos:
                repos[repo_id] = Repository(
                    id=repo_id,
                    name=origin.label or origin.origin,
                    origin=origin.origin,
                    label=origin.label,
                    suite=origin.suite,
                    components=[]
                )

    return list(repos.values())

def get_package_origin(package: apt.Package) -> str:
    """Get origin for a package"""
    if not package.candidate or not package.candidate.origins:
        return 'unknown'

    # Use first origin
    origin = package.candidate.origins[0]
    return origin.origin
```

## Frontend: State Management

### Global State

Use React Context for shared state:

```typescript
interface AppState {
  // Store state
  stores: Store[];
  activeStore: string | null;

  // Repository state
  repositories: Repository[];
  activeRepo: string | null;

  // Package state
  packages: Package[];
  filteredPackages: Package[];

  // UI state
  activeTab: TabKey;
  searchQuery: string;
  isLoading: boolean;
}

interface AppActions {
  setActiveStore: (storeId: string | null) => void;
  setActiveRepo: (repoId: string | null) => void;
  setActiveTab: (tab: TabKey) => void;
  setSearchQuery: (query: string) => void;
  refreshPackages: () => Promise<void>;
}

const AppContext = React.createContext<{
  state: AppState;
  actions: AppActions;
}>(null);
```

### Local Storage Persistence

```typescript
const STORAGE_KEYS = {
  activeStore: 'cockpit-apt.activeStore',
  activeRepo: 'cockpit-apt.activeRepo',
  lastTab: 'cockpit-apt.lastTab'
};

function saveState(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

function loadState(key: string, defaultValue: any): any {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}
```

## Integration with Existing Code

### cockpit-apt Architecture

Current structure:
```
src/
├── components/
│   ├── PackageList.tsx
│   ├── SectionGrid.tsx
│   └── ...
├── hooks/
│   ├── usePackages.ts
│   └── ...
├── services/
│   ├── apt.ts
│   └── ...
└── pages/
    └── SoftwarePage.tsx
```

### Integration Points

1. **SoftwarePage.tsx** - Add store toggle and repo dropdown
2. **usePackages.ts** - Add filtering logic
3. **apt.ts** - Add store config loading, debtag parsing, origin parsing
4. **PackageList.tsx** - Support custom sections from stores

### Modified SoftwarePage

```typescript
export const SoftwarePage: React.FC = () => {
  const { state, actions } = useContext(AppContext);
  const { stores, activeStore, repositories, activeRepo } = state;

  return (
    <Page>
      <PageSection variant="light">
        <Title headingLevel="h1">Software</Title>

        {/* Store toggle (conditional) */}
        <StoreToggleGroup
          stores={stores}
          activeStore={activeStore}
          onStoreChange={actions.setActiveStore}
        />

        {/* Repository dropdown (always present) */}
        <RepositoryDropdown
          repositories={repositories}
          activeRepo={activeRepo}
          activeStore={activeStore}
          onRepoChange={actions.setActiveRepo}
        />

        {/* Existing tabs */}
        <Tabs activeKey={state.activeTab} onSelect={actions.setActiveTab}>
          <Tab eventKey="browse" title="Browse">
            <BrowseTab packages={state.filteredPackages} />
          </Tab>
          {/* ... other tabs ... */}
        </Tabs>
      </PageSection>
    </Page>
  );
};
```

### Modified usePackages Hook

```typescript
export function usePackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    activeStore: loadState(STORAGE_KEYS.activeStore, null),
    activeRepo: loadState(STORAGE_KEYS.activeRepo, null),
    searchQuery: '',
    activeTab: 'browse'
  });

  // Load stores and repositories on mount
  useEffect(() => {
    Promise.all([
      cockpit.spawn(['python3', '-m', 'cockpit_apt.stores', 'list']),
      cockpit.spawn(['python3', '-m', 'cockpit_apt.repositories', 'list'])
    ]).then(([storesJson, reposJson]) => {
      setStores(JSON.parse(storesJson));
      setRepositories(JSON.parse(reposJson));
    });
  }, []);

  // Filter packages when filters change
  const filteredPackages = useMemo(() => {
    return filterPackages(packages, filters, stores);
  }, [packages, filters, stores]);

  return {
    packages,
    filteredPackages,
    stores,
    repositories,
    filters,
    setFilters
  };
}
```

## Custom Sections Support

### Purpose

Stores can define custom sections (e.g., "AIS", "Radar") that don't exist in standard Debian.

### Implementation

**Store Config** (`marine.yaml`):
```yaml
custom_sections:
  - id: ais
    label: AIS
    description: Automatic Identification System tools
    icon: ship

  - id: radar
    label: Radar
    description: Marine radar integration
    icon: radar
```

**SectionGrid Component**:
```typescript
interface Section {
  id: string;
  label: string;
  description: string;
  icon: string;
  packageCount: number;
  isCustom: boolean;
}

export const SectionGrid: React.FC<{ sections: Section[] }> = ({ sections }) => {
  // Combine standard Debian sections with custom store sections
  const allSections = useMemo(() => {
    const standard = getStandardSections();
    const custom = activeStore ? getCustomSections(activeStore) : [];
    return [...standard, ...custom];
  }, [activeStore]);

  return (
    <Gallery hasGutter>
      {allSections.map(section => (
        <Card key={section.id} isClickable onClick={() => viewSection(section)}>
          <CardTitle>
            {section.icon && <Icon>{section.icon}</Icon>}
            {section.label}
            {section.isCustom && <Badge>Custom</Badge>}
          </CardTitle>
          <CardBody>{section.description}</CardBody>
          <CardFooter>{section.packageCount} packages</CardFooter>
        </Card>
      ))}
    </Gallery>
  );
};
```

## Testing Strategy

### Unit Tests

**Store Config Loading**:
```python
def test_load_stores():
    stores = load_stores()
    assert len(stores) > 0
    assert stores[0].id == 'marine'

def test_parse_store_filter():
    data = {
        'id': 'test',
        'filters': {
            'include_tags': ['field::marine']
        }
    }
    store = parse_store_config(data)
    assert 'field::marine' in store.filters.include_tags
```

**Filter Matching**:
```python
def test_matches_store_filter():
    store = create_test_store()
    package = create_test_package(tags=['field::marine'])
    assert matches_store_filter(package, store)

def test_filter_cascade():
    packages = get_test_packages()
    filters = FilterState(activeStore='marine', activeRepo='hatlabs')
    result = filterPackages(packages, filters, stores)
    assert all(pkg.origin == 'Hat Labs' for pkg in result)
```

### Integration Tests

**UI Flow**:
```typescript
describe('Store Toggle', () => {
  it('hides when no stores installed', () => {
    render(<StoreToggleGroup stores={[]} />);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('shows when stores installed', () => {
    const stores = [{ id: 'marine', name: 'Marine Apps' }];
    render(<StoreToggleGroup stores={stores} />);
    expect(screen.getByText('Marine Apps')).toBeInTheDocument();
  });

  it('filters packages when store selected', async () => {
    const { user } = renderApp();
    await user.click(screen.getByText('Marine Apps'));
    expect(screen.queryByText('libc6')).not.toBeInTheDocument();
    expect(screen.getByText('signalk-server-container')).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
test('complete filter flow', async () => {
  // Start on System view
  expect(getAllPackages()).toHaveLength(5000);

  // Select Marine Apps store
  await selectStore('Marine Apps');
  expect(getFilteredPackages()).toHaveLength(20);

  // Filter by repository
  await selectRepository('Hat Labs');
  expect(getFilteredPackages()).toHaveLength(15);

  // Search within filtered set
  await typeSearch('signal');
  expect(getFilteredPackages()).toHaveLength(2);
});
```

## Performance Considerations

### Package List Filtering

- Use memoization (`useMemo`) for expensive filter operations
- Debounce search queries (300ms)
- Virtual scrolling for large package lists (react-window)
- Cache filtered results per filter combination

### Store Config Loading

- Load stores once on mount
- Cache in memory
- Watch for file changes (inotify) and reload
- Lazy load store branding assets (icons, banners)

### Repository Metadata

- Cache repository list
- Update only when APT cache updated
- Index packages by origin for O(1) lookup

## Future Enhancements

### Phase 1 (Current)
- Basic store toggle and repository dropdown
- Store config loading and filtering
- Debtag parsing and matching
- Custom sections support

### Phase 2
- Rich package details (screenshots, ratings)
- AppStream metadata integration
- Multi-language support
- Store branding (icons, banners in UI)

### Phase 3
- User reviews and ratings
- Package recommendations
- Advanced search (by tag, description, etc.)
- Store subscriptions (enable/disable stores)

### Phase 4
- Store analytics (popular apps, install trends)
- Automated testing of store filters
- Store validation tools
- Store creation wizard

## References

### Internal Documentation
- [META-PLANNING.md](../../META-PLANNING.md) - Overall project planning
- [halos-marine-containers/docs/DESIGN.md](../../halos-marine-containers/docs/DESIGN.md) - Store definitions
- [container-packaging-tools/docs/DESIGN.md](../../container-packaging-tools/docs/DESIGN.md) - Packaging tools
- [ADR-001-container-store.md](./ADR-001-container-store.md) - Architecture decision record

### External References
- [PatternFly React](https://www.patternfly.org/v4/get-started/develop) - UI component library
- [Cockpit Guide](https://cockpit-project.org/guide/latest/) - Cockpit development
- [Debtags](https://wiki.debian.org/Debtags) - Debian package tagging
- [APT Format](https://wiki.debian.org/DebianRepository/Format) - Repository metadata format
- [Python APT](https://apt-team.pages.debian.net/python-apt/library/index.html) - Python APT bindings
- [React Context](https://react.dev/learn/passing-data-deeply-with-context) - State management
