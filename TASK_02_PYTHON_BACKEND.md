# Task 02: Python Backend Implementation

**Phase:** 2
**Estimated Effort:** 1-2 weeks
**Dependencies:** Task 01 (Infrastructure)
**Status:** Not Started

## Overview

Complete the Python backend (cockpit-apt-bridge) by implementing all remaining commands beyond basic search. This includes package details, section listing, dependency queries, and optimization for performance.

## Goals

- Implement all cockpit-apt-bridge commands per TECHNICAL_SPEC
- Comprehensive error handling for all edge cases
- Input validation for all commands
- Performance optimization (meet <500ms target for queries)
- Complete test coverage (90%+)
- Mock fixtures for testing without real APT

## Detailed Requirements

### Commands to Implement

**Already Implemented (Task 01):**
- search QUERY

**To Implement (Task 02):**
- details PACKAGE_NAME
- sections
- list-section SECTION_NAME
- list-installed
- list-upgradable
- dependencies PACKAGE_NAME
- reverse-dependencies PACKAGE_NAME

### Command Specifications

**details PACKAGE_NAME:**

Purpose: Get comprehensive information about a single package

Input: Package name (string, validated)

Output: PackageDetails JSON object

Fields:
- name
- summary
- description (full multi-paragraph)
- section
- priority
- homepage
- maintainer
- size (download size in bytes)
- installedSize (installed size in bytes)
- installed (boolean)
- installedVersion (string or null)
- candidateVersion (string or null)
- dependencies (array of Dependency objects)
- reverseDependencies (array of package names, limit 50)

Error Cases:
- Package not found: code NOT_FOUND, exit 2
- Invalid package name: code INVALID_INPUT, exit 3

Performance Target: <200ms

**sections:**

Purpose: List all Debian sections with package counts

Input: None

Output: Array of Section objects

Fields per section:
- name (section identifier, e.g., "admin")
- count (total packages in section)

Sorting: Alphabetical by section name

Filter: Only sections with at least one package

Performance Target: <1s

**list-section SECTION_NAME:**

Purpose: List all packages in a specific section

Input: Section name (string, validated)

Output: Array of Package objects

Fields per package:
- name
- summary
- installed
- version (candidate version)

Sorting: Alphabetical by package name

Empty Section: Return empty array (not error)

Performance Target: <1s

**list-installed:**

Purpose: List all installed packages

Input: None

Output: Array of Package objects

Fields per package:
- name
- version (installed version)
- summary
- section

Sorting: Alphabetical by package name

Performance Target: <1s

**list-upgradable:**

Purpose: List packages with available upgrades

Input: None

Output: Array of UpgradablePackage objects

Fields per package:
- name
- installedVersion
- candidateVersion
- summary

Sorting: Alphabetical by package name

Note: Must call cache.upgrade() to mark upgradable packages

Performance Target: <2s (includes upgrade marking)

**dependencies PACKAGE_NAME:**

Purpose: Get direct dependencies of a package

Input: Package name (validated)

Output: Array of Dependency objects

Fields per dependency:
- name
- relation (e.g., ">=", "=")
- version (version constraint, may be empty)

Includes: Direct dependencies only (not transitive)

Handles: Multiple dependency options (OR relationships)

Error Cases:
- Package not found: code NOT_FOUND, exit 2
- Package has no candidate version: return empty array

Performance Target: <200ms

**reverse-dependencies PACKAGE_NAME:**

Purpose: Get packages that depend on this package

Input: Package name (validated)

Output: Array of package names (strings)

Limit: 50 results (performance consideration)

Includes: Direct reverse dependencies only

Note: May be slow for common libraries

Error Cases:
- Package not found: code NOT_FOUND, exit 2

Performance Target: <1s (acceptable to be slower)

### Error Handling Requirements

**Input Validation:**

Package names must:
- Be non-empty
- Contain only: a-z, 0-9, +, -, .
- Not exceed 255 characters
- Not contain path separators or shell metacharacters

Section names must:
- Be non-empty
- Contain only: a-z, 0-9, -, /, _
- Not exceed 100 characters

**Error Response Format:**

All errors output to stderr as JSON:

```json
{
  "error": "User-friendly message",
  "code": "ERROR_CODE",
  "details": "Optional technical details"
}
```

**Error Codes:**
- NOT_FOUND: Package/section not found (exit 2)
- INVALID_INPUT: Invalid input parameters (exit 3)
- APT_ERROR: python-apt library error (exit 1)
- CACHE_ERROR: Failed to load APT cache (exit 1)
- GENERAL_ERROR: Unexpected error (exit 1)

**Exception Handling:**

Wrap all python-apt operations in try-except

Catch specific exceptions:
- apt.cache.FetchFailedException
- apt.cache.LockFailedException
- KeyError (package not in cache)
- ValueError (invalid version strings)

Generic catch-all for unexpected exceptions

Log full traceback for debugging (stderr, before JSON error)

**Graceful Degradation:**

If optional field unavailable (e.g., homepage), return empty string or null

If dependency parsing fails for one package, skip that dependency

Never crash - always return valid JSON or JSON error

### Performance Optimization

**Cache Reuse:**

Load apt.cache.Cache() once per invocation

Pass cache object to helper functions

Don't reload cache mid-execution

**Result Limiting:**

Limit search results to 100 packages (already implemented)

Limit reverse dependencies to 50 packages

Implement early termination in loops where possible

**Memory Management:**

Use generators where appropriate (large lists)

Don't build complete package list if not needed

Delete large objects when done

**Profiling:**

Add timing code in development mode

Identify slow operations

Consider caching strategies for future optimization

### Code Organization

**Function Structure:**

Main entry point: parse argv, dispatch to command functions

One function per command (e.g., cmd_details, cmd_sections)

Helper functions:
- load_cache() - Load and return apt cache
- package_to_dict(pkg) - Convert package object to dict
- validate_package_name(name) - Input validation
- validate_section_name(name) - Input validation
- format_error(message, code, details) - Create error JSON

**Type Hints:**

All functions have type hints

Use typing module: Optional, List, Dict, Any

Document parameter and return types

**Error Handling:**

Decorator for consistent error handling (optional)

Standard pattern: try/except with JSON error output

Validation before processing

**Code Style:**

Follow PEP 8

Use descriptive variable names

Add docstrings to all functions

Keep functions focused and small (< 50 lines ideally)

## Implementation Steps

### Step 1: Helper Functions

1. Implement validate_package_name()
2. Implement validate_section_name()
3. Implement format_error()
4. Implement package_to_dict() with all fields
5. Add type hints to all helpers

**Validation:** Unit tests for helpers pass

### Step 2: Details Command

1. Implement cmd_details()
2. Parse package name from argv
3. Validate input
4. Query apt cache
5. Extract all required fields
6. Handle dependencies
7. Format JSON output
8. Error handling

**Validation:** Can get details for known package, error for unknown

### Step 3: Sections Command

1. Implement cmd_sections()
2. Iterate all packages in cache
3. Build section -> count mapping
4. Sort sections alphabetically
5. Format JSON output
6. Error handling

**Validation:** Returns list of sections with correct counts

### Step 4: List Section Command

1. Implement cmd_list_section()
2. Parse section name from argv
3. Validate input
4. Filter packages by section
5. Sort packages by name
6. Format JSON output
7. Error handling

**Validation:** Lists packages in section correctly

### Step 5: List Installed Command

1. Implement cmd_list_installed()
2. Filter packages where is_installed == True
3. Extract installed version
4. Sort packages by name
5. Format JSON output
6. Error handling

**Validation:** Lists installed packages only

### Step 6: List Upgradable Command

1. Implement cmd_list_upgradable()
2. Call cache.upgrade() to mark upgrades
3. Filter packages where is_upgradable == True
4. Extract installed and candidate versions
5. Sort packages by name
6. Format JSON output
7. Error handling

**Validation:** Lists only packages with available upgrades

### Step 7: Dependencies Command

1. Implement cmd_dependencies()
2. Parse package name from argv
3. Validate input
4. Get package candidate version
5. Parse dependencies list
6. Format as Dependency objects
7. Handle OR dependencies
8. Format JSON output
9. Error handling

**Validation:** Returns correct dependencies with relations

### Step 8: Reverse Dependencies Command

1. Implement cmd_reverse_dependencies()
2. Parse package name from argv
3. Validate input
4. Iterate all packages
5. Check if each package depends on target
6. Collect package names
7. Limit to 50 results
8. Format JSON output
9. Error handling

**Validation:** Returns packages that depend on target

### Step 9: Command Dispatcher

1. Update main entry point
2. Map command names to functions
3. Handle unknown commands
4. Ensure all commands tested

**Validation:** All commands accessible via command line

### Step 10: Performance Testing

1. Add timing code
2. Test each command with realistic data
3. Identify slow operations
4. Optimize where possible
5. Verify targets met

**Validation:** All commands meet performance targets

### Step 11: Documentation

1. Add module docstring
2. Document each function
3. Document error codes
4. Document output formats
5. Add usage examples in comments

**Validation:** Code is well-documented

## Testing Requirements

### Unit Tests Structure

Create separate test files for logical grouping:

**test/python/test_apt_bridge.py:**
- Main entry point tests
- Command dispatcher tests
- Error handling tests

**test/python/test_details.py:**
- Details command tests
- All success cases
- All error cases

**test/python/test_sections.py:**
- Sections command tests
- List-section command tests

**test/python/test_installed.py:**
- List-installed command tests
- List-upgradable command tests

**test/python/test_dependencies.py:**
- Dependencies command tests
- Reverse-dependencies command tests

**test/python/fixtures.py:**
- Shared fixtures
- Mock apt cache creation
- Sample package data

### Test Cases

**test_details_success:**
- Get details for known package
- Verify all fields present
- Verify types correct
- Verify dependencies formatted correctly

**test_details_not_found:**
- Request details for nonexistent package
- Verify JSON error output
- Verify exit code 2
- Verify error code NOT_FOUND

**test_details_invalid_name:**
- Provide invalid package name (e.g., "../etc/passwd")
- Verify JSON error output
- Verify exit code 3
- Verify error code INVALID_INPUT

**test_sections_success:**
- Call sections command
- Verify array of sections returned
- Verify counts are positive integers
- Verify sorted alphabetically

**test_list_section_success:**
- List packages in known section (e.g., "admin")
- Verify packages returned
- Verify all in correct section
- Verify sorted alphabetically

**test_list_section_empty:**
- List packages in valid but empty section
- Verify empty array returned
- Verify no error

**test_list_installed_success:**
- List installed packages
- Verify only installed packages returned
- Verify version is installed version

**test_list_upgradable_success:**
- Mock packages with available upgrades
- Call list-upgradable
- Verify correct packages returned
- Verify both versions present

**test_list_upgradable_none:**
- All packages up to date
- Verify empty array returned

**test_dependencies_success:**
- Get dependencies for package with dependencies
- Verify dependency objects have name, relation, version
- Verify all direct dependencies present

**test_dependencies_no_deps:**
- Get dependencies for package with no dependencies
- Verify empty array returned

**test_reverse_dependencies_success:**
- Get reverse deps for common package (e.g., libc6)
- Verify array of package names
- Verify limit enforced (max 50)

**test_reverse_dependencies_none:**
- Get reverse deps for package nothing depends on
- Verify empty array returned

**test_input_validation:**
- Test various invalid inputs for all commands
- Verify all caught and return INVALID_INPUT

**test_error_handling:**
- Mock apt cache to raise exceptions
- Verify graceful error handling
- Verify JSON error output
- Verify appropriate exit codes

### Mock Strategy

**Mock apt.cache.Cache:**
- Create MockCache class
- Implements iteration, key access
- Returns MockPackage objects
- Configurable for different test scenarios

**Mock Package Objects:**
- Create MockPackage class
- Has all required attributes
- Configurable installed state
- Configurable dependencies

**Fixture Data:**
- Sample packages with realistic data
- Cover common scenarios (installed, not installed, upgradable)
- Include packages with dependencies
- Include packages in various sections

### Coverage Requirements

**Target:** 90% overall

**Critical Paths:**
- All command functions: 100%
- Error handling: 100%
- Input validation: 100%

**Acceptable Lower Coverage:**
- Main entry point: 80% (some error paths hard to test)
- Performance optimization code: 70% (timing-dependent)

## Performance Testing

### Performance Test Suite

Create test/python/test_performance.py

**Metrics to Measure:**
- Execution time for each command
- Memory usage (peak)
- Cache load time

**Test Scenarios:**

**test_search_performance:**
- Search for common term
- Measure time from start to JSON output
- Assert < 500ms (after cache load)

**test_details_performance:**
- Get details for package
- Measure time
- Assert < 200ms

**test_sections_performance:**
- List all sections
- Measure time
- Assert < 1s

**test_list_section_performance:**
- List packages in large section (e.g., "libs")
- Measure time
- Assert < 1s

**Note:** Cache load time excluded from measurements (one-time cost)

### Performance Optimization Techniques

**Early Returns:**
- Return as soon as result complete
- Don't process more than needed

**Generator Usage:**
- Use generators for iteration where appropriate
- Avoid building large intermediate lists

**Selective Field Loading:**
- Only load fields actually needed
- Defer expensive operations (reverse dependencies)

**Result Limiting:**
- Enforce limits early in processing
- Don't compute full results then slice

## Acceptance Criteria

### Functionality

- All eight commands implemented and functional
- All commands return valid JSON
- All commands handle errors gracefully
- Input validation works for all commands
- All error cases return appropriate error codes

### Performance

- search: < 500ms (after cache load)
- details: < 200ms
- sections: < 1s
- list-section: < 1s
- list-installed: < 1s
- list-upgradable: < 2s
- dependencies: < 200ms
- reverse-dependencies: < 1s

### Code Quality

- All functions have type hints
- All functions have docstrings
- Code follows PEP 8
- No pylint/flake8 warnings
- Mypy type checking passes

### Testing

- All unit tests pass
- Test coverage >= 90%
- Performance tests pass
- Mock fixtures work in CI (no real APT needed)

### Documentation

- Module docstring explains purpose
- Each command documented
- Error codes documented
- Usage examples in comments

## Dependencies

Depends on Task 01 completion:
- Project structure exists
- Testing framework configured
- cockpit-apt-bridge file created with search command

## Risks and Mitigations

**Risk:** python-apt API variations between Debian versions
**Mitigation:** Test on target Debian version, document requirements

**Risk:** Performance issues with large package counts
**Mitigation:** Implement result limiting, profiling, optimization

**Risk:** Incomplete error handling leads to crashes
**Mitigation:** Comprehensive exception handling, thorough testing

**Risk:** Mock fixtures don't reflect real APT behavior
**Mitigation:** Test with real APT in development, document edge cases

## Deliverables Checklist

- [ ] All eight commands implemented
- [ ] Input validation for all commands
- [ ] Error handling for all error cases
- [ ] JSON output for all commands
- [ ] Type hints on all functions
- [ ] Docstrings on all functions
- [ ] Unit tests for all commands (90% coverage)
- [ ] Mock fixtures for testing without APT
- [ ] Performance tests implemented
- [ ] All performance targets met
- [ ] Code passes linting (flake8, mypy)
- [ ] Documentation updated
- [ ] Manual testing completed

## Next Steps

After Task 02 completion, proceed to:
- **Task 03:** TypeScript API wrapper implementation (depends on this task)

## Notes

Focus on correctness and error handling over optimization initially. Performance can be improved iteratively as long as basic targets are met. The mock fixtures are critical for CI/CD - ensure they're comprehensive and realistic.

Consider edge cases carefully: empty results, missing fields, malformed data. The robustness of this layer determines the reliability of the entire application.
