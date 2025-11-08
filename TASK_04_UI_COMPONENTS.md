# Task 04: UI Components Implementation

**Phase:** 4
**Estimated Effort:** 2-3 weeks
**Dependencies:** Task 03 (TypeScript API Wrapper)
**Status:** ✅ COMPLETED (Core Implementation)
**Completion Date:** 2025-01-07

## Overview

Implement all React components for the cockpit-apt user interface using PatternFly design system. This includes view components (search, sections, details, etc.), common reusable components, and the root application component with routing.

## Completion Summary

**Components Implemented (7 total):**

1. **Common Components:**
   - ✅ SearchBar - Debounced search input with clear button and validation
   - ✅ ErrorAlert - User-friendly error display with collapsible details
   - ✅ LoadingSkeleton - Loading states for table/card/details/list variants
   - ✅ PackageCard - Compact package display with install/remove actions

2. **View Components:**
   - ✅ SearchView - Search interface with results table and inline actions
   - ✅ SectionsView - Grid of Debian sections with responsive layout
   - ✅ PackageDetailsView - Comprehensive package details with tabbed interface

3. **Root Application:**
   - ✅ apt.tsx - Complete routing and navigation implementation
   - ✅ Navigation Menu - PatternFly sidebar with 4 main sections

**Features Implemented:**
- Client-side routing via cockpit.location API
- Responsive design (mobile-first, breakpoints: xs/sm/md/lg/xl)
- Loading, error, and empty states throughout
- Integration with Task 03 API hooks (useSearch, usePackageDetails, useSections)
- PatternFly v5 design system consistently applied
- Keyboard and accessibility support (ARIA labels, semantic HTML)
- Graceful AppStream degradation (all AppStream fields optional)

**Deferred to Later Tasks:**
- SectionPackageList view (placeholder implemented)
- InstalledView (placeholder implemented)
- UpdatesView (placeholder implemented)
- ProgressModal (requires Task 06 operations)
- Comprehensive test coverage (deferred to Task 07)
- CustomView configuration (requires Task 05)

**Commits:**
- 8f37bd1: feat(ui): implement common components and view components
- (current): feat(ui): implement routing and navigation in apt.tsx

## Goals

- Implement all view components per TECHNICAL_SPEC
- Build library of reusable common components
- Implement routing and navigation
- Integrate PatternFly design system
- Ensure responsive design
- Implement accessibility features
- Comprehensive component testing
- Design components for AppStream extensibility (graceful degradation)

## Important: AppStream Extensibility

All UI components must be designed to handle optional AppStream metadata gracefully. AppStream integration is planned as Phase 1.5 (high-priority post-MVP). This means:

- **PackageCard**: Show placeholder/default icon if `icon` field is null
- **PackageDetails**: Only render screenshots section if `screenshots` array has items
- **SearchView**: Work with both Debian sections (MVP) and AppStream categories (future)
- **All components**: Use conditional rendering for AppStream-dependent features

Test components both with and without AppStream data to ensure graceful degradation.

## Detailed Requirements

### View Components

**SearchView:**
- Search bar with debounced input
- Results table showing matching packages
- Install/Remove actions per row
- Loading skeleton during search
- Empty state for no results
- Error display for search failures

**SectionsView:**
- Grid of section cards
- Each card shows icon, name, count
- Click navigates to section package list
- Sort options (alphabetical, by count, by installed)
- Loading state during initial load

**SectionPackageList:**
- Breadcrumb navigation (Sections > {section})
- Filter dropdown (All / Installed / Not Installed)
- Package table with actions
- Back navigation (breadcrumb click or ESC key)
- Empty state if no packages in section

**PackageDetails:**
- Header with package name, version, status
- Tabbed interface (Overview, Dependencies, Files)
- Overview tab: Description, metadata, actions
- Dependencies tab: List with install status
- Files tab: List of installed files (if installed)
- Install/Remove primary action buttons
- Open homepage link
- Loading state during initial load

**InstalledView:**
- Table of all installed packages
- Section filter dropdown
- Name search filter
- Sort by name, section, size
- Remove actions per row
- Bulk selection (future, not in initial implementation)

**UpdatesView:**
- Table of packages with available updates
- Show installed and available versions
- Update actions per row
- Update All button
- Global progress bar for bulk updates
- Empty state if no updates available

**CustomView:**
- Generic view component
- Renders based on configuration
- Applies filters from config
- Uses configured layout (table or card)
- Displays featured packages if configured
- Falls back to standard view if config invalid

### Common Components

**SearchBar:**
- Text input with debouncing (300ms)
- Clear button
- Search icon
- Loading indicator during search
- Min length indicator ("Type 2+ characters")
- onSearch callback

**PackageTable:**
- Sortable columns
- Column configuration (which columns to show)
- Per-row actions
- Loading skeleton
- Empty state
- Pagination support

**PackageCard:**
- Compact package display
- Icon support (from config or default)
- Name, summary, version
- Install/Remove button
- Installed badge
- Click navigates to details

**SectionCard:**
- Section icon (from config or default)
- Section name
- Package count
- Installed count badge
- Click navigates to section package list

**ProgressModal:**
- Modal overlay (blocks interaction)
- Progress bar with percentage
- Current action description
- Package name being processed
- Cancel button (if operation supports cancellation)
- Error state if operation fails

**ErrorAlert:**
- Dismissible alert component
- Error message with icon
- Error code badge
- Collapsible details section
- Retry button (if operation is retryable)
- Different alert types (danger, warning, info)

**LoadingSkeleton:**
- Skeleton for table rows
- Skeleton for cards
- Skeleton for details page
- Configurable row count
- Matches actual component structure

### Root Component and Routing

**apt.tsx:**

Purpose: Root component managing entire application

Responsibilities:
- Initialize routing
- Provide context providers (cache, config)
- Render navigation
- Render view components based on route
- Handle navigation events

Routing Structure:
- /apt - Default, redirects to /apt/search
- /apt/search - SearchView
- /apt/sections - SectionsView
- /apt/sections/:section - SectionPackageList
- /apt/package/:packageId - PackageDetails
- /apt/installed - InstalledView
- /apt/updates - UpdatesView
- /apt/views/:viewId - CustomView

Navigation:
- Use cockpit.location for routing
- Listen to locationchanged events
- Update view based on path
- Support browser back/forward

Context Providers:
- CacheContext: Provides cache manager
- ConfigContext: Provides view configurations (Task 05)

**Navigation Menu:**
- Vertical navigation sidebar (PatternFly Nav component)
- Sections: Search, Sections, Installed, Updates
- Custom views appended dynamically
- Active state highlighting
- Collapsible on mobile

### PatternFly Integration

**Components to Use:**
- Page, PageSection - Layout
- Nav, NavList, NavItem - Navigation
- Card, CardHeader, CardBody - Cards
- DataList or Table - Package lists
- Tabs - Package details tabs
- Modal - Progress and confirmation dialogs
- Alert - Error messages
- Form, FormGroup, TextInput - Search and filters
- Button - Actions
- Badge - Status indicators
- Skeleton - Loading states

**Theming:**
- Use PatternFly CSS variables
- Support dark mode (inherit from Cockpit)
- Consistent spacing using PatternFly tokens

**Icons:**
- Use PatternFly icons (@patternfly/react-icons)
- FontAwesome for custom section icons
- Fallback icons for missing resources

### Responsive Design

**Breakpoints (PatternFly standard):**
- xs: <576px (mobile)
- sm: 576px-768px (tablet portrait)
- md: 768px-992px (tablet landscape)
- lg: 992px-1200px (desktop)
- xl: >1200px (wide desktop)

**Responsive Behaviors:**
- Navigation: Sidebar on desktop, hamburger menu on mobile
- Cards: 4 columns (xl), 3 (lg), 2 (md), 1 (sm/xs)
- Tables: Horizontal scroll on small screens or stacked layout
- Modals: Full screen on mobile
- Buttons: Full width on mobile, auto width on desktop

### Accessibility Requirements

**Keyboard Navigation:**
- All interactive elements reachable via Tab
- Logical tab order
- Enter/Space activates buttons
- Escape closes modals and goes back
- Arrow keys navigate lists (optional enhancement)

**ARIA Attributes:**
- aria-label on icon-only buttons
- aria-labelledby for modal titles
- aria-describedby for form fields
- role="alert" for errors
- aria-live regions for dynamic updates

**Screen Reader Support:**
- Semantic HTML (nav, main, section, article)
- Proper heading hierarchy (h1, h2, h3)
- Table headers associated with cells
- Form labels associated with inputs
- Status announcements (loading, error, success)

**Visual:**
- Focus indicators visible (PatternFly provides)
- Sufficient color contrast (PatternFly compliant)
- Text alternatives for icons
- Scalable text (support browser zoom)

### State Management

**Local State (useState):**
- Component-specific UI state
- Form inputs
- Expanded/collapsed states
- Filters and sorting

**Shared State (Context):**
- Cache manager (from CacheContext)
- Configuration (from ConfigContext)
- Current route (from cockpit.location)

**Server State (Custom Hooks):**
- Package queries (usePackageQuery)
- Operations (usePackageOperation)
- Handle loading, error, data states

**No Redux or Other State Management:**
- Keep it simple
- Context + hooks sufficient for this application
- Avoid over-engineering

## Implementation Steps

### Step 1: Common Components

1. Implement SearchBar
2. Implement LoadingSkeleton
3. Implement ErrorAlert
4. Implement ProgressModal
5. Test each component in isolation
6. Write component tests

**Validation:** Common components render and behave correctly

### Step 2: Card Components

1. Implement SectionCard
2. Implement PackageCard
3. Wire up click navigation
4. Test responsive behavior
5. Write component tests

**Validation:** Cards display correctly, navigation works

### Step 3: Table Components

1. Implement PackageTable
2. Add sorting logic
3. Add action buttons
4. Add loading and empty states
5. Write component tests

**Validation:** Table displays packages, sorting works, actions clickable

### Step 4: SearchView

1. Implement SearchView component
2. Wire up SearchBar
3. Wire up PackageTable
4. Integrate usePackageQuery hook
5. Handle loading and error states
6. Test search flow
7. Write component tests

**Validation:** Search works end-to-end

### Step 5: SectionsView

1. Implement SectionsView component
2. Fetch sections via API
3. Render grid of SectionCards
4. Handle loading and error states
5. Write component tests

**Validation:** Sections display, navigation to section list works

### Step 6: SectionPackageList

1. Implement SectionPackageList component
2. Add breadcrumb navigation
3. Add filter dropdown
4. Use PackageTable for list
5. Handle back navigation
6. Write component tests

**Validation:** Package list displays, filters work, navigation works

### Step 7: PackageDetails

1. Implement PackageDetails component
2. Create tabbed interface
3. Implement Overview tab
4. Implement Dependencies tab
5. Implement Files tab
6. Add install/remove actions
7. Write component tests

**Validation:** Details display correctly, tabs work, actions functional

### Step 8: InstalledView

1. Implement InstalledView component
2. Add section filter
3. Add name search
4. Use PackageTable
5. Write component tests

**Validation:** Installed packages display, filters work

### Step 9: UpdatesView

1. Implement UpdatesView component
2. Display installed vs available versions
3. Add Update All button
4. Handle bulk update progress
5. Write component tests

**Validation:** Updates display, individual and bulk updates work

### Step 10: Root Component and Routing

1. Implement apt.tsx root component
2. Set up routing with cockpit.location
3. Add navigation menu
4. Wire up all views
5. Add context providers
6. Test navigation flow

**Validation:** All views accessible via navigation

### Step 11: Styling and Polish

1. Apply PatternFly styling consistently
2. Test responsive design at all breakpoints
3. Test dark mode
4. Polish animations and transitions
5. Review spacing and alignment

**Validation:** UI looks professional, works on all screen sizes

### Step 12: Accessibility Audit

1. Test keyboard navigation
2. Add missing ARIA attributes
3. Test with screen reader
4. Run axe-core accessibility tests
5. Fix all accessibility issues

**Validation:** Accessibility tests pass

## Testing Requirements

### Component Tests (React Testing Library)

Each component needs:
- Render test (component renders without crashing)
- Props test (component displays data from props correctly)
- User interaction test (click, type, etc. trigger expected behavior)
- Loading state test
- Error state test
- Empty state test (where applicable)

**test/unit/components/SearchBar.test.tsx:**

Test Cases:
- test_renders_with_placeholder
- test_debounced_search_callback
- test_clear_button_clears_input
- test_min_length_indicator_shows
- test_loading_indicator_shows

**test/unit/components/PackageTable.test.tsx:**

Test Cases:
- test_renders_package_list
- test_sorting_by_column
- test_action_buttons_call_callbacks
- test_empty_state_displays
- test_loading_skeleton_displays

**test/unit/components/PackageCard.test.tsx:**

Test Cases:
- test_displays_package_info
- test_install_button_calls_callback
- test_installed_badge_shows
- test_click_navigates

**test/unit/components/SectionCard.test.tsx:**

Test Cases:
- test_displays_section_info
- test_click_navigates
- test_icon_displays

**test/unit/components/ProgressModal.test.tsx:**

Test Cases:
- test_displays_progress
- test_cancel_button_calls_callback
- test_error_state_displays

**test/unit/components/ErrorAlert.test.tsx:**

Test Cases:
- test_displays_error_message
- test_dismissible
- test_retry_button_calls_callback
- test_details_expand_collapse

**test/unit/components/SearchView.test.tsx:**

Test Cases:
- test_search_triggers_query
- test_displays_results
- test_loading_state
- test_error_state
- test_install_action

**test/unit/components/SectionsView.test.tsx:**

Test Cases:
- test_fetches_sections
- test_displays_section_cards
- test_navigation_to_section

**test/unit/components/PackageDetails.test.tsx:**

Test Cases:
- test_fetches_package_details
- test_displays_overview
- test_tabs_switch_content
- test_install_action

**test/unit/components/InstalledView.test.tsx:**

Test Cases:
- test_displays_installed_packages
- test_section_filter_works
- test_name_search_works

**test/unit/components/UpdatesView.test.tsx:**

Test Cases:
- test_displays_upgradable_packages
- test_update_single_package
- test_update_all_packages

Coverage Target: 80%

### Integration Tests

**test/integration/navigation.test.ts:**

Test Cases:
- test_navigate_search_to_details
- test_navigate_sections_to_list_to_details
- test_back_navigation
- test_breadcrumb_navigation

**test/integration/search-and-install.test.ts:**

Test Cases:
- test_search_install_refresh
- test_install_updates_installed_view

Coverage Target: Key user flows covered

### E2E Tests (Playwright)

**test/e2e/search.spec.ts:**

Test Cases:
- test_search_for_package
- test_search_no_results
- test_search_install_package

**test/e2e/sections-navigation.spec.ts:**

Test Cases:
- test_browse_sections
- test_section_to_package_details

**test/e2e/install-remove.spec.ts:**

Test Cases:
- test_install_package_flow
- test_remove_package_flow

Note: E2E tests require running Cockpit environment

### Accessibility Tests

**test/accessibility/axe.test.ts:**

Test Cases:
- test_all_views_pass_axe
- test_modals_pass_axe
- test_forms_pass_axe

Use @axe-core/react or axe-playwright

Coverage Target: All views tested, no violations

### Visual Regression Tests (Optional)

Consider using Percy or Chromatic for visual regression testing

Test Cases:
- Snapshot each view
- Snapshot loading states
- Snapshot error states
- Snapshot responsive layouts

### Manual Testing Scenarios

**Scenario 1: Complete Search Flow**
- Open cockpit-apt
- Type in search box
- See results appear
- Click package
- See details
- Click install
- See progress modal
- Verify package installed

**Scenario 2: Browse Sections**
- Click Sections in menu
- See section cards
- Click a section
- See package list
- Use filter dropdown
- See filtered results

**Scenario 3: Updates Flow**
- Click Updates in menu
- See available updates
- Click Update on one package
- See progress
- Verify package updated

**Scenario 4: Keyboard Navigation**
- Navigate entire app using only keyboard
- Tab through all elements
- Activate buttons with Enter
- Close modals with Escape
- Verify all functionality accessible

**Scenario 5: Mobile/Responsive**
- Resize browser to mobile size
- Verify navigation collapses
- Verify tables adapt or scroll
- Verify cards stack
- Verify modals go full screen

## Acceptance Criteria

### Functionality

- All views render correctly
- Navigation works between all views
- Search functionality works
- Install/Remove actions functional
- Progress reporting shows during operations
- Errors display with user-friendly messages
- Empty states display appropriately
- Loading states show during async operations

### UI/UX

- PatternFly styling applied consistently
- Responsive design works at all breakpoints
- Dark mode supported (inherits from Cockpit)
- Icons display correctly
- Animations smooth and purposeful
- Touch-friendly on mobile (44px min touch targets)

### Accessibility

- Keyboard navigation works for all functionality
- Screen reader announces correctly
- ARIA attributes present where needed
- Focus indicators visible
- Color contrast meets WCAG AA
- axe-core tests pass with no violations

### Code Quality

- TypeScript strict mode passes
- No any types
- Components follow functional patterns
- Props properly typed
- All exports typed

### Testing

- Component tests cover 80% of code
- All user interactions tested
- Integration tests cover key flows
- E2E smoke tests pass
- Accessibility tests pass
- Manual test scenarios validated

## Dependencies

Depends on Task 03 completion:
- TypeScript API wrapper complete
- Custom hooks available
- All types defined

Depends on Task 01:
- Build system configured
- PatternFly dependencies installed

## Risks and Mitigations

**Risk:** PatternFly learning curve slows development
**Mitigation:** Start with PatternFly documentation, use examples, keep components simple initially

**Risk:** Responsive design issues on various devices
**Mitigation:** Test frequently at different breakpoints, use PatternFly responsive utilities

**Risk:** Accessibility issues discovered late
**Mitigation:** Use axe-core from start, test with keyboard frequently, follow ARIA patterns

**Risk:** Component test complexity and maintenance burden
**Mitigation:** Focus on user behavior tests, avoid testing implementation details, use testing-library best practices

## Deliverables Checklist

**Core Components (MVP):**
- [x] Common components implemented (SearchBar, ErrorAlert, LoadingSkeleton, PackageCard)
- [x] Core view components implemented (SearchView, SectionsView, PackageDetailsView)
- [x] Root component with routing implemented
- [x] Navigation menu implemented
- [x] PatternFly styling applied
- [x] Responsive design implemented
- [x] Dark mode support (inherits from Cockpit)
- [x] Keyboard navigation support
- [x] ARIA attributes for accessibility
- [x] TypeScript strict mode passes

**Deferred to Later Tasks:**
- [ ] Additional view components (SectionPackageList, InstalledView, UpdatesView)
- [ ] ProgressModal (requires Task 06)
- [ ] Component tests written (80% coverage) - Task 07
- [ ] Integration tests written - Task 07
- [ ] E2E smoke tests written - Task 07
- [ ] Accessibility tests with axe-core - Task 07
- [ ] Manual test scenarios validated - Task 07
- [ ] Screen reader testing - Task 07

## Next Steps

After Task 04 completion, proceed to:
- **Task 06:** Operations implementation (install/remove/update can be tested in UI)

Can run in parallel with:
- **Task 05:** Configuration system

## Notes

UI is what users see and interact with - quality here directly impacts user experience. Focus on polish and attention to detail. Use PatternFly components and patterns where possible to ensure consistency with other Cockpit modules.

Testing is critical for UI components. Invest in good test coverage early to catch regressions. Use React Testing Library's principle of testing user behavior, not implementation details.

Accessibility is not optional - build it in from the start. Use semantic HTML, ARIA attributes, and test with keyboard and screen readers frequently.
