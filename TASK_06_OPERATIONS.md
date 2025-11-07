# Task 06: Operations Implementation

**Phase:** 6
**Estimated Effort:** 1-2 weeks
**Dependencies:** Task 03 (TypeScript API), Task 04 (UI Components)
**Status:** Not Started

## Overview

Complete and test the package operation functions (install, remove, update) end-to-end in a real system environment. This includes refining progress reporting, error handling, cache invalidation, and ensuring operations work correctly with real APT.

## Goals

- Validate install/remove/update operations on real system
- Refine progress reporting based on real apt-get output
- Complete error handling for all operation failure modes
- Ensure cache invalidation works correctly
- Implement lock detection and waiting
- Add confirmation dialogs for destructive operations
- Manual test all operation scenarios
- Document known issues and limitations

## Detailed Requirements

### Install Operation

**Implementation Refinement:**

Already implemented in Task 03, needs validation and refinement

Command Used:
```bash
apt-get install -y -o APT::Status-Fd=3 -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold PACKAGE_NAME
```

Real-World Testing:
- Test install on clean system
- Test install when already installed (should succeed, no-op)
- Test install with large package (observe progress)
- Test install with many dependencies
- Test install with post-install scripts
- Test install failure (bad package name, network error, etc.)

Progress Reporting Refinement:
- Verify pmstatus lines parsed correctly
- Verify dlstatus lines parsed correctly
- Verify percentage updates smoothly
- Handle missing Status-Fd output gracefully
- Handle apt-get hanging (timeout)

Cache Invalidation:
- After successful install, invalidate:
  - Installed packages cache
  - Package details for installed package
  - Upgradable packages cache (package no longer upgradable)
- Verify UI refreshes after install

Error Cases to Handle:
- Package not found
- Network error during download
- Disk space insufficient
- Dependencies unmet (should auto-resolve with apt-get)
- Post-install script failure
- User cancels operation
- Lock held by another process
- Permission denied (not superuser)

User Experience:
- Show confirmation dialog before install (optional, configurable)
- Display package size before installing
- Show progress modal during install
- Show success message after install
- Navigate to package details after install

### Remove Operation

**Implementation Refinement:**

Already implemented in Task 03, needs validation and refinement

Command Used:
```bash
apt-get remove -y -o APT::Status-Fd=3 PACKAGE_NAME
```

Real-World Testing:
- Test remove installed package
- Test remove not-installed package (should fail gracefully)
- Test remove with reverse dependencies warning
- Test remove essential package (should prevent or warn)
- Test purge vs remove (future: add purge option)

Progress Reporting:
- Similar to install
- Verify removal progress tracked correctly

Cache Invalidation:
- After successful remove, invalidate:
  - Installed packages cache
  - Package details for removed package
- Verify UI refreshes after remove

Error Cases to Handle:
- Package not installed (or never existed)
- Package is essential (prevent removal)
- Package has reverse dependencies (warn, allow force)
- Post-remove script failure
- Lock held
- Permission denied

User Experience:
- Show confirmation dialog before remove (required for safety)
- List reverse dependencies if any
- Warn if essential or important package
- Show progress modal during removal
- Show success message after removal
- Return to package list after removal

Safety Checks:
- Prevent removal of: dpkg, apt, apt-get, libc6, init
- Warn on removal of: systemd, dbus, cockpit
- Show reverse dependencies count

### Update Package Lists Operation

**Implementation Refinement:**

Already implemented in Task 03, needs validation and refinement

Command Used:
```bash
apt-get update
```

Real-World Testing:
- Test update with network connectivity
- Test update without network (should fail gracefully)
- Test update with slow network
- Test update with partial mirror failures

Progress Reporting:
- apt-get update doesn't provide good Status-Fd output
- Parse stdout for progress indication
- Show indeterminate progress bar
- Update progress message as mirrors are fetched

Cache Invalidation:
- After successful update, invalidate:
  - All caches (entire package catalog may have changed)
- Trigger refresh of current view

Error Cases to Handle:
- Network unavailable
- Repository unreachable
- GPG signature verification failure
- Partial mirror failure (some repos fail)
- Lock held
- Permission denied

User Experience:
- Manual trigger (button in Updates view or menu)
- Show progress modal
- Show which repositories are being updated
- Show success/failure per repository
- Offer retry on failure

### Lock Handling

**Lock Detection Implementation:**

Already implemented in Task 03, needs validation

Use Cases:
- Detect before operation (prevent "dpkg interrupted" errors)
- Show helpful message if locked
- Offer to wait for lock
- Allow cancel during wait

Testing:
- Open synaptic or apt-get in terminal
- Try operation in cockpit-apt
- Verify lock detected
- Verify wait functionality
- Verify operation proceeds after lock released
- Verify cancel during wait works

Timeout Behavior:
- Default timeout: 60 seconds
- Poll interval: 2 seconds
- User can cancel at any time
- Show countdown/spinner during wait

### Confirmation Dialogs

**Implementation Requirements:**

Add confirmation dialogs before destructive operations

**Remove Confirmation:**

Required before removing any package

Dialog Content:
- Title: "Remove Package?"
- Message: "Are you sure you want to remove [package name]?"
- Show package size will be freed
- Show reverse dependencies if any
- Buttons: Cancel (default), Remove (danger)

Additional Warnings:
- Essential package: "This is an essential package. Removing it may break your system."
- Important package: "This package is important. Removal may cause issues."
- Has reverse dependencies: "X other packages depend on this package."

**Install Confirmation (Optional):**

Optional confirmation before install (configurable)

Dialog Content:
- Title: "Install Package?"
- Message: "Install [package name] version [version]?"
- Show download size
- Show installed size
- Show additional packages to be installed (dependencies)
- Buttons: Cancel, Install

**Update All Confirmation:**

Required before bulk update

Dialog Content:
- Title: "Update All Packages?"
- Message: "X packages will be updated"
- Show total download size
- List packages to be updated (scrollable)
- Buttons: Cancel, Update All

### Error Handling Refinement

**Error Message Improvements:**

For each error type, provide:
- User-friendly message (what happened)
- Actionable advice (what user can do)
- Technical details (collapsible, for debugging)

**Examples:**

Network Error:
- Message: "Unable to download packages"
- Action: "Check your internet connection and try again"
- Details: Full apt-get error output

Disk Full:
- Message: "Not enough disk space"
- Action: "Free up space and try again. Required: X MB, Available: Y MB"
- Details: Disk usage information

Lock Held:
- Message: "Another package manager is running"
- Action: "Close other package managers (Update Manager, Synaptic, etc.) and try again, or wait"
- Details: Process holding lock (if detectable)

### Progress Reporting Refinement

**Status-Fd Output Parsing:**

Handle variations in real apt-get output:
- Progress may not be linear (jumps in percentage)
- Some packages may not report progress
- Download and install phases separate
- Handle malformed lines gracefully

**Progress Phases:**

Clearly indicate which phase is active:
- Preparing: Resolving dependencies
- Downloading: Fetching packages
- Installing: Unpacking and configuring
- Configuring: Running post-install scripts
- Cleaning: Final cleanup

**Progress Accuracy:**

- Show realistic percentage (don't extrapolate)
- If percentage unknown, show indeterminate progress
- Update message to reflect current action
- Show package name being processed

### Cache Invalidation Strategy

**Invalidation Rules:**

Comprehensive cache invalidation logic:

On Install Success:
- Invalidate: installed list
- Invalidate: upgradable list
- Invalidate: details for installed package
- Invalidate: search results (package now installed)

On Remove Success:
- Invalidate: installed list
- Invalidate: details for removed package
- Invalidate: search results (package now not installed)

On Update Success:
- Invalidate: all caches (everything may have changed)

On Operation Failure:
- Don't invalidate (state unchanged)

**Manual Cache Clear:**

Provide way for user to manually clear cache:
- Menu item or button (admin mode)
- Useful if APT operations done outside cockpit-apt
- Refresh current view after clear

## Implementation Steps

### Step 1: Install Operation Testing

1. Test install on real system
2. Identify any issues with progress parsing
3. Refine error handling
4. Test cache invalidation
5. Fix any bugs found

**Validation:** Install works correctly, progress accurate

### Step 2: Remove Operation Testing

1. Test remove on real system
2. Implement safety checks
3. Test reverse dependency detection
4. Test cache invalidation
5. Fix any bugs found

**Validation:** Remove works correctly, safety checks effective

### Step 3: Update Operation Testing

1. Test update on real system
2. Refine progress indication
3. Handle partial failures
4. Test cache invalidation
5. Fix any bugs found

**Validation:** Update works, cache refreshed

### Step 4: Lock Handling Testing

1. Test lock detection with various tools
2. Test wait functionality
3. Test timeout behavior
4. Test cancel during wait

**Validation:** Lock handling works correctly

### Step 5: Confirmation Dialogs

1. Implement remove confirmation
2. Add safety warnings
3. Implement install confirmation (optional feature)
4. Implement update all confirmation
5. Test all dialogs

**Validation:** Confirmations prevent accidental operations

### Step 6: Error Handling Refinement

1. Test all error scenarios
2. Improve error messages
3. Add actionable advice
4. Test error display in UI

**Validation:** Errors are clear and helpful

### Step 7: Progress Reporting Refinement

1. Test with various package sizes
2. Test with many dependencies
3. Refine progress calculation
4. Test indeterminate progress

**Validation:** Progress is accurate and informative

### Step 8: Cache Invalidation Testing

1. Test each invalidation scenario
2. Verify UI refreshes correctly
3. Test manual cache clear
4. Fix any stale data issues

**Validation:** Cache invalidation works correctly

### Step 9: Integration Testing

1. Test complete flows (search -> details -> install -> refresh)
2. Test error recovery
3. Test concurrent operations (should prevent)
4. Test edge cases

**Validation:** All flows work end-to-end

### Step 10: Documentation

1. Document known limitations
2. Document operation behavior
3. Document error handling
4. Update user documentation

**Validation:** Operations are well-documented

## Testing Requirements

### Manual Test Scenarios

**Critical - Must Test on Real System:**

All tests require real APT/Debian system, cannot be mocked

**Test Scenario 1: Install Small Package**
- Search for small package (e.g., cowsay)
- Click install
- Observe progress modal
- Verify installation completes
- Verify package shows as installed
- Verify cache refreshed

**Test Scenario 2: Install Large Package**
- Search for large package (e.g., libreoffice)
- Click install
- Observe download progress
- Observe install progress
- Verify takes appropriate time
- Verify success

**Test Scenario 3: Install with Dependencies**
- Search for package with many dependencies
- Click install
- Verify dependencies installed automatically
- Verify progress for each package

**Test Scenario 4: Install Failure - Not Found**
- Try to install nonexistent package
- Verify error message
- Verify no system changes
- Verify cache not invalidated

**Test Scenario 5: Install Failure - Network**
- Disconnect network
- Try to install package
- Verify appropriate error message
- Reconnect network
- Retry, verify success

**Test Scenario 6: Remove Package**
- Install test package
- Click remove
- Verify confirmation dialog
- Confirm removal
- Verify package removed
- Verify cache refreshed

**Test Scenario 7: Remove with Reverse Dependencies**
- Remove package that others depend on
- Verify warning shown
- Verify can proceed or cancel

**Test Scenario 8: Remove Essential Package**
- Try to remove essential package (e.g., dpkg)
- Verify prevented or strong warning
- Verify system protected

**Test Scenario 9: Update Package Lists**
- Click update lists
- Observe progress
- Verify repositories updated
- Verify cache cleared
- Verify package lists refreshed

**Test Scenario 10: Lock Held**
- Open Synaptic or run apt-get in terminal
- Try operation in cockpit-apt
- Verify lock detected
- Verify wait option offered
- Close other tool
- Verify operation proceeds

**Test Scenario 11: Operation Cancel**
- Start install of large package
- Click cancel during download
- Verify operation cancelled
- Verify system in clean state

**Test Scenario 12: Progress Accuracy**
- Install multiple packages
- Observe progress percentages
- Verify progress increases monotonically
- Verify reaches 100% on completion

### Integration Tests (Limited)

Most testing must be manual, but some integration tests possible:

**test/integration/operation-flow.test.ts:**

Test Cases (with mocked apt-get):
- test_install_invalidates_cache
- test_remove_invalidates_cache
- test_update_invalidates_all_caches
- test_concurrent_operations_prevented
- test_lock_detection

Note: Use mocked cockpit.spawn, cannot actually install packages in CI

### Test Documentation

**Create test/MANUAL_TEST_PLAN.md:**

Comprehensive manual test plan with:
- Step-by-step instructions
- Expected results
- Pass/fail criteria
- Known issues
- Environment requirements

## Acceptance Criteria

### Functionality

- Install operation works on real system
- Remove operation works with safety checks
- Update operation refreshes package lists
- Progress reporting accurate during operations
- Lock detection and waiting works
- Confirmation dialogs prevent accidents
- Cache invalidation works correctly

### Error Handling

- All error scenarios handled gracefully
- Error messages are user-friendly
- Actionable advice provided
- System never left in broken state

### User Experience

- Operations feel responsive
- Progress updates regularly
- Success/failure clearly communicated
- Confirmations prevent mistakes
- UI refreshes after operations

### Safety

- Essential packages cannot be removed (or strong warning)
- Reverse dependencies shown before removal
- Confirmation required for destructive operations
- Lock prevents concurrent operations

### Documentation

- Manual test plan complete
- Known limitations documented
- Operation behavior documented
- Troubleshooting guide included

## Dependencies

Depends on Task 03:
- Operation functions implemented
- Progress parsing implemented

Depends on Task 04:
- ProgressModal component
- Confirmation dialogs (need to implement)
- Error display

## Risks and Mitigations

**Risk:** Operations fail in ways not anticipated
**Mitigation:** Extensive manual testing, graceful error handling, user feedback

**Risk:** Progress parsing breaks with APT version changes
**Mitigation:** Defensive parsing, graceful degradation, test on multiple Debian versions

**Risk:** Cache invalidation misses cases, shows stale data
**Mitigation:** Conservative invalidation (invalidate more rather than less), manual clear option

**Risk:** Safety checks have false positives/negatives
**Mitigation:** Test extensively, allow admin override, document behavior

## Deliverables Checklist

- [ ] Install operation tested on real system
- [ ] Remove operation tested on real system
- [ ] Update operation tested on real system
- [ ] Progress reporting refined
- [ ] Lock handling tested
- [ ] Confirmation dialogs implemented
- [ ] Safety checks implemented
- [ ] Error handling refined
- [ ] Cache invalidation verified
- [ ] All manual test scenarios completed
- [ ] Manual test plan documented
- [ ] Known issues documented
- [ ] User documentation updated

## Next Steps

After Task 06 completion:
- Application is feature-complete
- Proceed to Task 07 (Polish and Finalization)
- Package for distribution
- Beta testing

## Notes

This task is critical for reliability. Operations that modify the system must be thoroughly tested and safe. Take time to test all error scenarios and edge cases.

Most testing must be manual as it involves real APT operations. Create comprehensive test documentation so testing can be repeated during development and before releases.

Safety is paramount - better to prevent a dangerous operation than to allow it and deal with the consequences. Err on the side of caution with warnings and confirmations.

Progress reporting accuracy matters for user experience. Users should see realistic progress, not jumping percentages. If progress is indeterminate, show that explicitly rather than faking percentages.
