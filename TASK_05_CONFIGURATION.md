# Task 05: Configuration System

**Phase:** 5
**Estimated Effort:** 1 week
**Dependencies:** Task 03 (TypeScript API), partial dependency on Task 04 (CustomView component)
**Status:** Not Started

## Overview

Implement the configuration system that allows cockpit-apt to be extended with custom views and filters through JSON configuration files. This enables use cases like the Container Store without modifying core code.

## Goals

- Implement configuration file loading from multiple sources
- Validate configuration files against schema
- Merge configurations with proper priority
- Provide configuration via React context
- Implement CustomView component that renders based on configuration
- Create default and example configurations
- Handle configuration errors gracefully

## Detailed Requirements

### Configuration File Locations

**Priority Order (lowest to highest):**

1. Built-in default: `/usr/share/cockpit/apt/views/default.json`
   - Shipped with package
   - Provides standard views (Search, Sections, Installed, Updates)
   - Always loaded first

2. System configurations: `/etc/cockpit/apt/views.d/*.json`
   - Admin-created custom views
   - Loaded alphabetically
   - Can override or extend built-in views

3. User configuration: `~/.config/cockpit/apt/views.json` (future)
   - Per-user customization
   - Not implemented in initial version
   - Documented for future enhancement

### Configuration File Format

**Root Structure:**

```json
{
  "version": "1.0",
  "views": [
    { ViewConfiguration },
    { ViewConfiguration }
  ]
}
```

**ViewConfiguration Interface:**

```typescript
interface ViewConfiguration {
  id: string;                    // Unique identifier, alphanumeric + dash
  name: string;                  // Display name in navigation
  enabled: boolean;              // Whether view is active
  type: "section-filter" | "custom-query" | "predefined-list";
  filter: FilterCriteria;        // Filtering rules
  sort?: SortCriteria;           // Sorting rules (optional)
  ui?: UICustomization;          // UI customization (optional)
}
```

**FilterCriteria Interface:**

```typescript
interface FilterCriteria {
  sections?: string[];           // Whitelist sections (Debian sections in MVP)
  sectionsExclude?: string[];    // Blacklist sections
  namePattern?: string;          // Regex for package names
  installed?: boolean;           // Filter by installed status
  priority?: string[];           // Filter by priority
  categories?: string[];         // AppStream categories (future, Phase 1.5)
}
```

**Future Enhancement**: The `categories` field will be implemented when AppStream support is added (Phase 1.5). In MVP, this field will be ignored if present. This allows configuration files to be forward-compatible with AppStream integration.

**SortCriteria Interface:**

```typescript
interface SortCriteria {
  field: "name" | "section" | "size" | "installedSize";
  order: "asc" | "desc";
}
```

**UICustomization Interface:**

```typescript
interface UICustomization {
  showIcons?: boolean;           // Display package icons
  showScreenshots?: boolean;     // Display screenshots
  showMetadata?: boolean;        // Show extended metadata
  cardLayout?: boolean;          // Use cards instead of table
  featuredPackages?: string[];   // Highlighted packages
  icon?: string;                 // Icon for navigation menu
}
```

### Configuration Loading

**config-loader.ts Implementation:**

Functions to implement:

**loadConfiguration(): Promise<Configuration>**

Purpose: Load and merge all configuration files

Steps:
1. Load built-in default configuration
2. Load all files from /etc/cockpit/apt/views.d/ (if exists)
3. Sort system configs alphabetically by filename
4. Merge configurations with later files overriding earlier
5. Validate merged configuration
6. Return Configuration object

Error Handling:
- Log errors for invalid config files
- Skip invalid files, continue with valid ones
- Never fail completely - always return at least default config

**validateConfiguration(config: unknown): Configuration**

Purpose: Validate configuration against schema

Steps:
1. Check structure (has version and views array)
2. Validate each view configuration
3. Check required fields present
4. Check field types correct
5. Check constraints (regex valid, IDs unique)
6. Return validated configuration or throw ValidationError

Validation Rules:
- id: non-empty, alphanumeric + dash only, max 50 chars, unique
- name: non-empty string, max 100 chars
- type: one of allowed enum values
- enabled: boolean
- filter: at least one criterion must be specified
- sections: array of strings, each valid section name
- namePattern: must be valid regex
- sort.field: one of allowed enum values
- sort.order: "asc" or "desc"
- ui.featuredPackages: array of package names (validated format)

**mergeConfigurations(base: Configuration, overlay: Configuration): Configuration**

Purpose: Merge two configurations

Rules:
- Views with same ID in overlay replace views in base
- Views with new IDs in overlay are appended
- Last-wins for duplicate IDs
- Preserve order from base, then overlay additions

**watchConfiguration(callback: (config: Configuration) => void): void**

Purpose: Watch for configuration file changes (future enhancement)

Not implemented in initial version, documented for later

### Configuration Context

**ConfigContext Implementation:**

Create React context providing configuration to components

**ConfigProvider Component:**

Purpose: Load configuration and provide via context

Lifecycle:
- On mount: Load configuration
- Provide configuration to children
- Re-load on signal (future)

**useConfig Hook:**

Purpose: Access configuration from any component

Returns:
- config: Configuration object
- views: Array of enabled views
- getView(id): Get specific view by ID
- loading: Boolean indicating if config still loading
- error: Error if configuration loading failed

### CustomView Component

**Implementation Requirements:**

Purpose: Generic view component rendering based on configuration

Props:
- viewId: string (view configuration ID)

Behavior:
1. Get view configuration from context
2. Apply filters to package list
3. Apply sort from configuration
4. Render using configured layout (table or cards)
5. Highlight featured packages if specified
6. Show appropriate empty state if no packages match

Filter Application:
- sections: Filter packages where section in whitelist
- sectionsExclude: Filter packages where section not in blacklist
- namePattern: Filter packages matching regex
- installed: Filter by installation status
- priority: Filter packages with priority in list

Layout Rendering:
- cardLayout: true → Use PackageCard grid
- cardLayout: false → Use PackageTable
- featuredPackages: Render separately at top

Icon Handling:
- Load icon from ui.icon if specified
- Default to generic icon if missing

Error Handling:
- Invalid view ID: Show error message
- Invalid configuration: Show error with details
- No matching packages: Show empty state

### Default Configuration

**default.json Contents:**

Provide standard views all users get:

**All Packages View:**
- ID: "all"
- Type: "custom-query"
- Filter: none (shows all packages)
- Sort: name ascending
- UI: Table layout

**Sections View:**
- Note: This is not a view configuration (it's built into UI)
- Sections browsing is always available

**Installed View:**
- ID: "installed"
- Type: "custom-query"
- Filter: installed = true
- Sort: name ascending
- UI: Table layout

**Updates View:**
- ID: "updates"
- Type: "custom-query"
- Shows packages with available upgrades
- Handled separately (not via config)

### Example Configurations

**Example 1: Container Store (container-store.json)**

Purpose: Show only container packages

Content:
- ID: "container-store"
- Name: "Container Applications"
- Type: "section-filter"
- Filter: sections = ["container/media", "container/marine", "container/productivity", "container/development"]
- UI: Card layout, show icons, featured = ["container-signalk", "container-jellyfin"]

**Example 2: System Administration (system-admin.json)**

Purpose: Show system admin tools

Content:
- ID: "system-admin"
- Name: "System Administration"
- Type: "section-filter"
- Filter: sections = ["admin", "utils"]
- UI: Table layout, no icons

**Example 3: Development Tools (development-tools.json)**

Purpose: Show development packages

Content:
- ID: "development"
- Name: "Development Tools"
- Type: "custom-query"
- Filter: sections = ["devel", "libdevel"], namePattern = ".*-(dev|devel)$"
- UI: Table layout

### Error Handling

**Configuration Loading Errors:**
- File not found: Log warning, skip file
- Invalid JSON: Log error with file path, skip file
- Validation failure: Log error with details, skip file
- Permission denied: Log error, skip file

**Runtime Errors:**
- Invalid view ID: Display error alert in UI
- Missing configuration: Fall back to default
- Invalid filter: Log error, show all packages

**User Feedback:**
- Configuration errors logged to browser console
- Admin mode: Show configuration validation errors in UI
- Normal mode: Silently skip invalid configs

### Configuration Validation Schema

Use a validation library (e.g., Zod, Yup) or manual validation

**Schema Definition:**

Define schema matching TypeScript interfaces

Validate:
- Required fields present
- Types correct
- Constraints satisfied
- Regex patterns valid
- Referenced resources exist (where possible)

Error Messages:
- Clear indication of what's wrong
- Location of error (file, view ID, field)
- Suggestion for fix if possible

## Implementation Steps

### Step 1: Type Definitions

1. Add configuration types to types.ts
2. Define ViewConfiguration interface
3. Define FilterCriteria interface
4. Define SortCriteria interface
5. Define UICustomization interface
6. Define Configuration root interface

**Validation:** Types compile, all fields documented

### Step 2: Validation Logic

1. Create validation functions
2. Implement schema validation
3. Add constraint checking
4. Write validation tests
5. Test with valid and invalid configs

**Validation:** All validation tests pass

### Step 3: Configuration Loading

1. Implement loadConfiguration function
2. Implement file reading (cockpit.file)
3. Implement JSON parsing
4. Implement error handling
5. Test loading from multiple sources

**Validation:** Loads configurations correctly

### Step 4: Configuration Merging

1. Implement mergeConfigurations function
2. Handle ID conflicts (last-wins)
3. Preserve order
4. Test with various merge scenarios

**Validation:** Merging works correctly

### Step 5: Configuration Context

1. Create ConfigContext
2. Implement ConfigProvider
3. Implement useConfig hook
4. Add loading and error states
5. Test context in components

**Validation:** Context provides config to components

### Step 6: CustomView Component

1. Implement CustomView component
2. Add filter application logic
3. Add sort application logic
4. Add layout rendering (table vs cards)
5. Handle featured packages
6. Handle error states

**Validation:** CustomView renders correctly

### Step 7: Default Configuration

1. Create views/default.json
2. Define standard views
3. Validate default config
4. Test default config loads

**Validation:** Default views available

### Step 8: Example Configurations

1. Create views/examples/ directory
2. Create container-store.json
3. Create system-admin.json
4. Create development-tools.json
5. Validate examples
6. Document example usage

**Validation:** Examples validate and work

### Step 9: Navigation Integration

1. Update navigation to include custom views
2. Dynamically add custom view menu items
3. Route to CustomView for custom view IDs
4. Test navigation

**Validation:** Custom views appear in navigation

### Step 10: Documentation

1. Document configuration format
2. Provide examples
3. Document validation rules
4. Document troubleshooting
5. Update TECHNICAL_SPEC if needed

**Validation:** Documentation is clear

## Testing Requirements

### Unit Tests

**test/unit/config-loader.test.ts:**

Test Cases:
- test_load_default_config
- test_load_system_configs
- test_merge_configs
- test_config_priority
- test_invalid_json_skipped
- test_invalid_config_skipped
- test_duplicate_view_ids

**test/unit/config-validator.test.ts:**

Test Cases:
- test_valid_config_passes
- test_missing_required_field_fails
- test_invalid_type_fails
- test_invalid_id_format_fails
- test_invalid_regex_pattern_fails
- test_duplicate_id_fails
- test_constraint_violations

**test/unit/useConfig.test.ts:**

Test Cases:
- test_hook_provides_config
- test_hook_loading_state
- test_hook_error_state
- test_hook_get_view

**test/unit/components/CustomView.test.tsx:**

Test Cases:
- test_renders_with_table_layout
- test_renders_with_card_layout
- test_applies_section_filter
- test_applies_name_pattern
- test_applies_installed_filter
- test_sorts_packages
- test_shows_featured_packages
- test_error_for_invalid_view_id

Coverage Target: 90%

### Integration Tests

**test/integration/config-loading.test.ts:**

Test Cases:
- test_load_multiple_configs
- test_merge_system_over_default
- test_custom_view_renders_from_config

**test/integration/filter-application.test.ts:**

Test Cases:
- test_section_filter_applied
- test_name_pattern_filter_applied
- test_multiple_filters_combined

Coverage Target: All integration scenarios tested

### Manual Testing Scenarios

**Scenario 1: Default Configuration**
- Fresh install (no system configs)
- Verify default views available
- Verify standard navigation works

**Scenario 2: Add Custom View**
- Create /etc/cockpit/apt/views.d/test.json
- Define custom view (container store)
- Reload application
- Verify custom view appears in navigation
- Verify filtering works

**Scenario 3: Invalid Configuration**
- Create invalid JSON file
- Reload application
- Verify error logged
- Verify app still works (skips invalid config)

**Scenario 4: Override Default View**
- Create config with ID matching default view
- Verify custom config overrides default
- Remove config
- Verify default restored

**Scenario 5: Multiple Filters**
- Create view with section filter + name pattern
- Verify both filters applied
- Verify only matching packages shown

## Acceptance Criteria

### Functionality

- Configuration files load from all sources
- Configurations merge with correct priority
- Validation catches all invalid configurations
- Invalid configs logged but don't crash app
- Custom views render correctly
- Filters apply correctly
- Sorting works as configured
- Layout (table vs cards) respects config

### Configuration Quality

- Default configuration provides standard views
- Example configurations demonstrate capabilities
- Configuration format is intuitive
- Validation messages are helpful

### Code Quality

- All functions typed
- TypeScript strict mode passes
- No any types
- All exports typed

### Testing

- Unit tests cover 90% of code
- Integration tests cover key scenarios
- All tests pass
- Manual scenarios validated

### Documentation

- Configuration format documented
- Examples provided
- Validation rules explained
- Troubleshooting guide included

## Dependencies

Depends on Task 03:
- TypeScript API for querying packages
- Types defined

Depends partially on Task 04:
- CustomView component implementation
- Can proceed mostly independently, integrate at end

## Risks and Mitigations

**Risk:** Complex validation logic becomes brittle
**Mitigation:** Use validation library (Zod), comprehensive tests

**Risk:** Configuration schema needs changes after release
**Mitigation:** Version schema, support migration, maintain backward compatibility

**Risk:** Users create incorrect configurations
**Mitigation:** Provide good examples, clear error messages, validation

**Risk:** Performance issues with complex filters
**Mitigation:** Optimize filter logic, consider caching filtered results

## Deliverables Checklist

- [ ] config-loader.ts complete and tested
- [ ] Configuration validation implemented
- [ ] Configuration merging implemented
- [ ] ConfigContext and ConfigProvider implemented
- [ ] useConfig hook implemented
- [ ] CustomView component implemented
- [ ] Filter application logic correct
- [ ] Sort application logic correct
- [ ] Layout rendering (table vs cards) working
- [ ] default.json created and validated
- [ ] Example configurations created
- [ ] Navigation integration complete
- [ ] Unit tests passing (90% coverage)
- [ ] Integration tests passing
- [ ] Manual test scenarios validated
- [ ] Documentation complete

## Next Steps

After Task 05 completion:
- Configuration system can be used immediately
- Container Store can be enabled by deploying container-store.json
- Users can create custom views as needed

## Notes

This configuration system is a key differentiator from cockpit-package-manager. It enables extensibility without code changes. Focus on making the configuration format intuitive and the validation helpful.

The system should be forgiving - skip invalid configurations but continue operating. Log errors clearly for administrators to debug.

Consider future enhancements like configuration UI (edit configs in Cockpit), hot reloading (watch files for changes), and user-specific configurations.
