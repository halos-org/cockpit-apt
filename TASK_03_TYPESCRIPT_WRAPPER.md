# Task 03: TypeScript API Wrapper

**Phase:** 3
**Estimated Effort:** 1-2 weeks
**Dependencies:** Task 02 (Python Backend)
**Status:** Not Started

## Overview

Complete the TypeScript API layer that wraps the Python backend and apt-get commands, providing a type-safe, Promise-based interface for UI components. This includes cache management, error handling, progress reporting, and operation functions.

## Goals

- Implement all query functions wrapping cockpit-apt-bridge commands
- Implement operation functions (install, remove, update)
- Build cache management system with TTL
- Implement progress parsing for apt-get Status-Fd output
- Create comprehensive error handling and translation
- Develop custom React hooks for common patterns
- Complete test suite with mocked cockpit.spawn

## Detailed Requirements

### Query Functions to Implement

**Already Implemented (Task 01):**
- searchPackages(query: string)

**To Implement:**
- getPackageDetails(name: string)
- listSections()
- listPackagesBySection(section: string)
- listInstalled()
- listUpgradable()
- isInstalled(name: string)

### Operation Functions to Implement

- installPackage(name: string, onProgress?: ProgressCallback)
- removePackage(name: string, onProgress?: ProgressCallback)
- updatePackageLists(onProgress?: ProgressCallback)

### Utility Functions to Implement

- isLocked()
- waitForLock(timeoutMs?: number)
- clearCache()

### Query Function Specifications

**getPackageDetails(name: string): Promise<PackageDetails>**

Implementation:
- Call cockpit-apt-bridge details command via cockpit.spawn
- Parse JSON response
- Validate response structure
- Return typed PackageDetails object
- Cache result for 60 seconds

Error Handling:
- Package not found: Throw APTError with code PACKAGE_NOT_FOUND
- Spawn error: Throw APTError with code EXEC_ERROR
- JSON parse error: Throw APTError with code PARSE_ERROR

**listSections(): Promise<Section[]>**

Implementation:
- Call cockpit-apt-bridge sections command
- Parse JSON response
- Cache result for 5 minutes
- Return typed Section array

**listPackagesBySection(section: string): Promise<Package[]>**

Implementation:
- Call cockpit-apt-bridge list-section command with section parameter
- Parse JSON response
- Cache result per section for 60 seconds
- Return typed Package array

Edge Case: Empty section returns empty array (not error)

**listInstalled(): Promise<Package[]>**

Implementation:
- Call cockpit-apt-bridge list-installed command
- Parse JSON response
- Cache result for 30 seconds
- Invalidate cache on install/remove operations
- Return typed Package array

**listUpgradable(): Promise<UpgradablePackage[]>**

Implementation:
- Call cockpit-apt-bridge list-upgradable command
- Parse JSON response
- Cache result for 60 seconds
- Return typed UpgradablePackage array

Type Definition for UpgradablePackage:
- name: string
- installedVersion: string
- candidateVersion: string
- summary: string

**isInstalled(name: string): Promise<boolean>**

Implementation:
- Call dpkg-query directly (faster than Python)
- Use cockpit.spawn with dpkg-query -W -f='${Status}' command
- Parse output looking for "install ok installed"
- Return boolean
- No caching (always check current state)

Error Handling: Return false on error (package doesn't exist)

### Operation Function Specifications

**installPackage(name: string, onProgress?: ProgressCallback): Promise<void>**

Implementation:
- Call cockpit.spawn with apt-get install command
- Use Status-Fd option for progress reporting
- Pass progress updates to callback
- Parse pmstatus and dlstatus lines
- Invalidate cache on success
- Superuser required

Command:
```
apt-get install -y -o APT::Status-Fd=3 -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold PACKAGE_NAME
```

Options Explained:
- -y: Assume yes to prompts
- -o APT::Status-Fd=3: Output progress to fd 3
- force-confdef: Use default for new config files
- force-confold: Keep old config files

Progress Parsing:
- pmstatus:package:percentage:message
- dlstatus:downloaded:percentage:message

Error Handling:
- Exit code != 0: Throw APTError with output as details
- Parse error messages from stderr
- Provide user-friendly error messages

**removePackage(name: string, onProgress?: ProgressCallback): Promise<void>**

Implementation:
- Call cockpit.spawn with apt-get remove command
- Use Status-Fd for progress
- Parse progress same as install
- Invalidate cache on success
- Superuser required

Command:
```
apt-get remove -y -o APT::Status-Fd=3 PACKAGE_NAME
```

**updatePackageLists(onProgress?: ProgressCallback): Promise<void>**

Implementation:
- Call cockpit.spawn with apt-get update command
- Parse output for progress indication
- Invalidate all caches on success
- Superuser required

Command:
```
apt-get update
```

Note: apt-get update doesn't provide Status-Fd progress well, so progress callback receives indeterminate updates

### Utility Function Specifications

**isLocked(): Promise<boolean>**

Implementation:
- Use fuser command to check if lock file is held
- Check /var/lib/dpkg/lock-frontend
- Return true if file is locked
- No privileges required

Command:
```
fuser /var/lib/dpkg/lock-frontend
```

Interpretation:
- Exit code 0: Lock held
- Exit code 1: Lock free

**waitForLock(timeoutMs: number = 60000): Promise<void>**

Implementation:
- Poll isLocked() every 2 seconds
- Resolve when lock is free
- Reject with APTError LOCK_TIMEOUT if timeout reached
- Allow cancellation

Use Case: Call before operations to avoid "dpkg was interrupted" errors

**clearCache(): void**

Implementation:
- Clear all cached query results
- Synchronous operation
- No side effects beyond cache clearing

Use Case: After external package changes (e.g., apt-get run from terminal)

### Cache Management

**Cache Implementation (cache-manager.ts):**

Data Structure:
- Map<string, CacheEntry> where key is cache key
- CacheEntry includes: data, timestamp, ttl

Cache Keys:
- Package details: `details:${packageName}`
- Sections: `sections`
- Section packages: `section:${sectionName}`
- Installed: `installed`
- Upgradable: `upgradable`

TTL Configuration:
- Package details: 60000 (60 seconds)
- Sections: 300000 (5 minutes)
- Section packages: 60000 (60 seconds)
- Installed: 30000 (30 seconds)
- Upgradable: 60000 (60 seconds)

Cache Invalidation Rules:
- On install: Clear `installed`, clear details for that package
- On remove: Clear `installed`, clear details for that package
- On update: Clear all caches

Functions:
- get(key): Get cached value or null if expired/missing
- set(key, value, ttl): Store value with TTL
- delete(key): Remove specific cache entry
- clear(): Remove all cache entries
- invalidatePattern(pattern): Remove entries matching pattern

### Error Handling

**APTError Class:**

Properties:
- message: string (user-friendly)
- code: string (error code for programmatic handling)
- details: string | null (technical details)
- cause: Error | null (original error)

Error Codes:
- PACKAGE_NOT_FOUND
- EXEC_ERROR
- PARSE_ERROR
- PERMISSION_DENIED
- LOCKED
- LOCK_TIMEOUT
- NETWORK_ERROR
- DISK_FULL
- UNKNOWN

**Error Translation (error-handler.ts):**

Function: translateError(error: any): APTError

Responsibilities:
- Catch cockpit.spawn errors
- Parse stderr output from apt-get
- Match known error patterns
- Provide user-friendly messages
- Preserve technical details for debugging

Error Patterns:
- "Could not get lock" → LOCKED
- "Unable to fetch" → NETWORK_ERROR
- "No space left" → DISK_FULL
- "E: Unable to locate package" → PACKAGE_NOT_FOUND

### Progress Reporting

**ProgressReporter Class:**

Purpose: Parse apt-get Status-Fd output and call progress callback

Properties:
- callback: ProgressCallback
- buffer: string (accumulated unparsed output)

Methods:
- handleData(data: string): Parse incoming data
- parseLine(line: string): Parse single status line
- reset(): Clear buffer

Status Line Formats:
- pmstatus:pkgname:percent:message
- dlstatus:already_downloaded:percent:message

Progress Update Structure:
- type: "status" | "download"
- package: string | null
- percentage: number (0-100)
- message: string

### Custom React Hooks

**usePackageQuery Hook:**

Purpose: Simplify package queries in components

Usage:
```typescript
const { data, loading, error, refetch } = usePackageQuery(
  () => getPackageDetails('nginx'),
  [packageName]
);
```

Implementation:
- useState for data, loading, error
- useEffect to run query on mount and dependency changes
- Cleanup on unmount
- Return object with data, loading state, error, refetch function

**usePackageOperation Hook:**

Purpose: Simplify install/remove operations in components

Usage:
```typescript
const { execute, progress, error, isRunning } = usePackageOperation(
  (name) => installPackage(name, setProgress)
);
```

Implementation:
- useState for progress, error, isRunning
- Async execute function
- Progress callback state management
- Error handling
- Return object with execute, progress, error, isRunning

**useConfig Hook:**

Purpose: Access configuration (for later use)

Placeholder implementation for now (returns empty config)

**useCache Hook:**

Purpose: Access cache manager

Implementation:
- useContext to get cache from context provider
- Expose cache operations
- Trigger re-renders on cache changes

## Implementation Steps

### Step 1: Cache Manager

1. Create cache-manager.ts
2. Implement CacheEntry interface
3. Implement CacheManager class
4. Add get, set, delete, clear methods
5. Implement TTL checking
6. Add unit tests

**Validation:** Cache stores and retrieves values, expires on TTL

### Step 2: Error Handler

1. Create error-handler.ts
2. Implement APTError class
3. Implement translateError function
4. Add error pattern matching
5. Add unit tests

**Validation:** Errors translated correctly, patterns matched

### Step 3: Progress Reporter

1. Create progress-reporter class in apt-wrapper.ts
2. Implement buffer management
3. Implement line parsing
4. Handle pmstatus and dlstatus
5. Add unit tests

**Validation:** Status-Fd output parsed correctly

### Step 4: Query Functions

1. Implement getPackageDetails
2. Implement listSections
3. Implement listPackagesBySection
4. Implement listInstalled
5. Implement listUpgradable
6. Integrate cache manager
7. Add error handling
8. Add unit tests for each

**Validation:** All query functions work with Python backend

### Step 5: Fast Utility Functions

1. Implement isInstalled using dpkg-query
2. Implement isLocked using fuser
3. Implement waitForLock with polling
4. Implement clearCache
5. Add unit tests

**Validation:** Utilities work correctly, timeouts handled

### Step 6: Operation Functions

1. Implement installPackage
2. Implement removePackage
3. Implement updatePackageLists
4. Wire up progress reporting
5. Wire up cache invalidation
6. Add error handling
7. Add unit tests (mocked)

**Validation:** Operations compile, mocked tests pass

### Step 7: Custom Hooks

1. Implement usePackageQuery
2. Implement usePackageOperation
3. Implement useCache
4. Add unit tests (React Testing Library)

**Validation:** Hooks work in test components

### Step 8: Integration Testing

1. Write integration tests
2. Test query -> cache -> query (cache hit)
3. Test operation -> cache invalidation
4. Test error flow end-to-end
5. Test progress reporting

**Validation:** All integration tests pass

### Step 9: Type Definitions

1. Review all types in types.ts
2. Add missing types
3. Ensure all functions properly typed
4. Add JSDoc comments
5. Run TypeScript strict checking

**Validation:** No TypeScript errors, all types correct

### Step 10: Documentation

1. Add JSDoc to all public functions
2. Document error codes
3. Document cache behavior
4. Add usage examples
5. Update TECHNICAL_SPEC if needed

**Validation:** API is well-documented

## Testing Requirements

### Unit Tests

**test/unit/cache-manager.test.ts:**

Test Cases:
- test_cache_set_and_get
- test_cache_expiration_by_ttl
- test_cache_delete
- test_cache_clear
- test_cache_invalidate_pattern

**test/unit/error-handler.test.ts:**

Test Cases:
- test_APTError_creation
- test_translateError_common_patterns
- test_translateError_unknown_error
- test_error_code_mapping

**test/unit/apt-wrapper.test.ts:**

Test Cases for each function:
- test_getPackageDetails_success
- test_getPackageDetails_not_found
- test_getPackageDetails_cached
- test_listSections_success
- test_listSections_cached
- test_listPackagesBySection_success
- test_listInstalled_success
- test_listUpgradable_success
- test_isInstalled_true
- test_isInstalled_false
- test_isLocked_locked
- test_isLocked_free
- test_waitForLock_success
- test_waitForLock_timeout
- test_clearCache

**test/unit/progress-reporter.test.ts:**

Test Cases:
- test_parse_pmstatus
- test_parse_dlstatus
- test_buffer_management
- test_multiline_input
- test_callback_invocation

**test/unit/hooks.test.ts:**

Test Cases:
- test_usePackageQuery_loading_state
- test_usePackageQuery_success_state
- test_usePackageQuery_error_state
- test_usePackageOperation_execution
- test_usePackageOperation_progress_updates

Mock Strategy:
- Mock cockpit.spawn for all tests
- Create factory functions for mock responses
- Test both success and error paths
- Ensure async behavior tested correctly

Coverage Target: 85%

### Integration Tests

**test/integration/query-flow.test.ts:**

Test Cases:
- test_query_with_cache_miss
- test_query_with_cache_hit
- test_cache_invalidation_on_operation

**test/integration/operation-flow.test.ts:**

Test Cases:
- test_install_with_progress
- test_install_with_error
- test_remove_with_progress
- test_update_lists

**test/integration/error-propagation.test.ts:**

Test Cases:
- test_python_error_to_typescript_error
- test_spawn_error_to_apt_error

Coverage Target: Key integration paths covered

### Manual Testing Scenarios

**Scenario 1: Query with Cache**
- Call getPackageDetails twice
- Verify second call is faster (cache hit)
- Clear cache
- Call again, verify cache miss

**Scenario 2: Install with Progress**
- Call installPackage with progress callback
- Verify callback called multiple times
- Verify final percentage is 100
- Verify package becomes installed

**Scenario 3: Lock Handling**
- Start apt-get in terminal
- Try to install package
- Verify lock detected
- Wait for lock release
- Verify operation succeeds

**Scenario 4: Error Handling**
- Try to install nonexistent package
- Verify APTError thrown
- Verify error message is user-friendly
- Verify error code is PACKAGE_NOT_FOUND

## Acceptance Criteria

### Functionality

- All query functions implemented and working
- All operation functions implemented and working
- All utility functions implemented and working
- Cache system working with correct TTL
- Progress reporting working for operations
- Error handling comprehensive

### TypeScript Quality

- All functions have explicit types
- No any types (except where absolutely necessary)
- Strict mode passes
- All exports properly typed

### Performance

- Cached queries return < 10ms
- Non-cached queries meet targets from TECHNICAL_SPEC
- No memory leaks in cache

### Testing

- Unit tests cover 85% of code
- All edge cases tested
- Mocks work without real APT
- Integration tests validate full flows

### Documentation

- All public functions have JSDoc
- Error codes documented
- Cache behavior explained
- Usage examples provided

## Dependencies

Depends on Task 02 completion:
- Python backend all commands working
- JSON output validated

Depends on Task 01:
- types.ts with all type definitions

## Risks and Mitigations

**Risk:** Mocking cockpit.spawn complex and error-prone
**Mitigation:** Create comprehensive mock utilities, test with real Cockpit when possible

**Risk:** Cache invalidation bugs causing stale data
**Mitigation:** Conservative TTLs, thorough testing of invalidation logic

**Risk:** Progress parsing brittle if apt-get output changes
**Mitigation:** Defensive parsing, graceful degradation if parse fails

**Risk:** Async error handling missed cases
**Mitigation:** Consistent error handling patterns, comprehensive tests

## Deliverables Checklist

- [ ] cache-manager.ts complete and tested
- [ ] error-handler.ts complete and tested
- [ ] All query functions implemented
- [ ] All operation functions implemented
- [ ] All utility functions implemented
- [ ] Custom hooks implemented
- [ ] Progress reporting working
- [ ] Cache invalidation logic correct
- [ ] All unit tests passing (85% coverage)
- [ ] Integration tests passing
- [ ] TypeScript strict mode passes
- [ ] All exports properly typed
- [ ] JSDoc comments complete
- [ ] Manual test scenarios validated

## Next Steps

After Task 03 completion, proceed to:
- **Task 04:** UI components implementation (uses this API)
- **Task 05:** Configuration system (can be parallel)

## Notes

This layer is critical for providing a clean, type-safe interface to UI components. Focus on correctness and type safety. The cache system will significantly improve perceived performance, but be careful with cache invalidation - stale data is worse than slow queries.

The custom hooks (usePackageQuery, usePackageOperation) will simplify UI component code significantly. Invest time in making these robust and easy to use.
