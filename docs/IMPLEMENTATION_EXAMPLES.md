# Cockpit APT - Implementation Examples

**Status**: Reference
**Date**: 2025-11-14
**Last Updated**: 2025-11-14

## Purpose

This document provides code examples and implementation patterns for the container store filtering features. For high-level design and architecture, see [SPEC.md](SPEC.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

**Note**: This is a reference document for developers implementing the features described in SPEC and ARCHITECTURE. It contains working code examples and patterns.

## Frontend Components

### Store Toggle Group Component

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

**State Management Example**:
```typescript
const [activeStore, setActiveStore] = useState<string | null>(
  localStorage.getItem('cockpit-apt.activeStore') || null
);

const handleStoreChange = (storeId: string | null) => {
  setActiveStore(storeId);
  localStorage.setItem('cockpit-apt.activeStore', storeId || '');
  refreshPackages();
};
```

### Repository Dropdown Component

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
  const [isOpen, setIsOpen] = useState(false);

  // Helper to get repository display name
  const getRepoName = (repoId: string | null) => {
    if (!repoId) return "All";
    const repo = repositories.find(r => r.id === repoId);
    return repo?.name || "Unknown";
  };

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
      toggle={<DropdownToggle onToggle={setIsOpen}>Repository: {getRepoName(activeRepo)}</DropdownToggle>}
      isOpen={isOpen}
      onSelect={(event, selection) => {
        onRepoChange(selection as string);
        setIsOpen(false);
      }}
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

**State Management Example**:
```typescript
const [activeRepo, setActiveRepo] = useState<string | null>(
  localStorage.getItem('cockpit-apt.activeRepo') || null
);

const handleRepoChange = (repoId: string | null) => {
  setActiveRepo(repoId);
  localStorage.setItem('cockpit-apt.activeRepo', repoId || '');
  refreshPackages();
};
```

### Filter Cascade Implementation

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

## Backend Implementation

### Store Configuration Loading

```python
import os
import yaml
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass, field

@dataclass
class StoreFilter:
    include_origins: List[str] = field(default_factory=list)
    include_sections: List[str] = field(default_factory=list)
    include_tags: List[str] = field(default_factory=list)
    include_packages: List[str] = field(default_factory=list)

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
    section_metadata: Dict[str, CustomSection] = field(default_factory=dict)

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

    section_metadata = {
        section_id: CustomSection(
            id=section_id,
            **metadata
        )
        for section_id, metadata in data.get('section_metadata', {}).items()
    }

    return StoreConfig(
        id=data['id'],
        name=data['name'],
        description=data['description'],
        icon=data['icon'],
        banner=data['banner'],
        filters=filters,
        section_metadata=section_metadata
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

    # OR logic between categories: any match qualifies
    # If no filters specified, package doesn't match
    if not matches:
        return False

    return any(matches)
```

### Debtag Parsing

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

def get_tag_facet(tag: str) -> Tuple[str, str]:
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

### Repository Origin/Label Parsing

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

### Global State Management with React Context

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
} | null>(null);
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

## Integration Examples

### SoftwarePage Component Integration

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

### usePackages Hook with Filtering

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
      cockpit.spawn(['python3', '-m', 'cockpit_apt_bridge.stores', 'list']),
      cockpit.spawn(['python3', '-m', 'cockpit_apt_bridge.repositories', 'list'])
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

### Custom Sections in SectionGrid Component

**Store Config Example** (`marine.yaml`):
```yaml
section_metadata:
  ais:
    label: AIS
    description: Automatic Identification System tools
    icon: ship
  radar:
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

export const SectionGrid: React.FC<{ sections?: Section[]; activeStore: string | null }> = ({ sections, activeStore }) => {
  // Use provided sections prop if available, otherwise combine standard and custom sections
  const allSections = useMemo(() => {
    if (sections && sections.length > 0) {
      return sections;
    }
    const standard = getStandardSections();
    const custom = activeStore ? getCustomSections(activeStore) : [];
    return [...standard, ...custom];
  }, [sections, activeStore]);

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

## Testing Examples

### Unit Test Examples
```python
def test_load_stores():
    stores = load_stores()
    assert len(stores) > 0
    assert stores[0].id == 'marine'

def test_parse_store_filter():
    data = {
        'id': 'test',
        'name': 'Test Store',
        'description': 'Test description',
        'icon': '/path/to/icon.svg',
        'banner': '/path/to/banner.png',
        'filters': {
            'include_tags': ['field::marine']
        }
    }
    store = parse_store_config(data)
    assert 'field::marine' in store.filters.include_tags

# Filter matching tests
def test_matches_store_filter():
    store = create_test_store()
    package = create_test_package(tags=['field::marine'])
    assert matches_store_filter(package, store)

def test_filter_cascade():
    packages = get_test_packages()
    filters = FilterState(activeStore='marine', activeRepo='hatlabs')
    result = filterPackages(packages, filters, stores)
    assert all(pkg.origin == 'Hat Labs' for pkg in result)

# Integration test examples
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

### E2E Test Example

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

## Related Documentation

- [SPEC.md](SPEC.md) - Technical specification and requirements
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design
- [ADR-001-container-store.md](./ADR-001-container-store.md) - Architecture decision record
