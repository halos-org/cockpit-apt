# E2E Testing Guide

This guide explains how to run end-to-end (E2E) tests for cockpit-apt using Playwright.

## Overview

E2E tests verify the complete application running in a real Cockpit environment. They test user interactions, navigation, keyboard accessibility, and the integration between frontend and backend.

## Prerequisites

1. **Test Server**: A running Cockpit instance at `https://halos.local:9090`
2. **Test User**: User account `claude` with password `claude123`
3. **Module Installed**: cockpit-apt module deployed to the test server
4. **Playwright Browsers**: Chromium browser installed locally

## Setup

### First Time Setup

Install Playwright browsers (Chromium only):

```bash
cd frontend
npx playwright install chromium
```

### Test Server Setup

The E2E tests expect:
- **URL**: `https://halos.local:9090`
- **User**: `claude`
- **Password**: `claude123`
- **Module**: cockpit-apt accessible at `/apt`

You can modify these in `playwright.config.ts` if needed.

## Running Tests

### All Tests

```bash
cd frontend
npm run test:e2e
```

### Interactive UI Mode

Run tests with Playwright's interactive UI:

```bash
npm run test:e2e:ui
```

This opens a browser where you can:
- See all tests
- Run individual tests
- Watch tests execute
- Debug failures with time-travel debugging

### Specific Test File

```bash
npx playwright test search.spec.ts
```

### Single Test

```bash
npx playwright test -g "should search and display results"
```

### Debug Mode

```bash
npx playwright test --debug
```

## Test Structure

```
frontend/e2e/
├── fixtures.ts           # Shared test fixtures (auto-login)
├── search.spec.ts        # Search functionality tests
├── sections.spec.ts      # Section navigation tests
└── keyboard.spec.ts      # Keyboard navigation & accessibility
```

### Test Coverage

**25 E2E tests total:**

1. **Package Search** (7 tests)
   - Display search view
   - Show hint for short queries
   - Search and display results
   - Clear search with Escape
   - Search immediately with Enter
   - Show empty state for no results
   - Navigate to package details

2. **Sections Navigation** (8 tests)
   - Display sections view
   - Display section cards
   - Navigate to section packages
   - Keyboard navigation
   - Tab key navigation
   - Package list display
   - Navigate to package details
   - Back button navigation

3. **Keyboard Navigation** (6 tests)
   - Navigate tabs with keyboard
   - Activate search with Enter
   - Clear search with Escape
   - Navigate package details with Escape
   - Activate section cards with Enter
   - Activate section cards with Space

4. **Accessibility** (4 tests)
   - ARIA labels on navigation
   - ARIA labels on section cards
   - Proper heading hierarchy
   - Focus visible on interactive elements

## Configuration

### playwright.config.ts

Key settings:

```typescript
{
  testDir: './e2e',
  timeout: 30000,           // 30 second timeout per test
  fullyParallel: true,      // Run tests in parallel
  retries: 0,               // No retries locally (2 on CI)

  use: {
    baseURL: 'https://halos.local:9090',
    ignoreHTTPSErrors: true,  // Accept self-signed certs
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium' }      // Chromium only
  ],
}
```

### Fixtures

The `fixtures.ts` file provides an authenticated page that:
1. Automatically logs into Cockpit
2. Navigates to the APT module
3. Waits for the module to load
4. Provides a ready-to-test page

All tests import from `./fixtures` instead of `@playwright/test`:

```typescript
import { test, expect } from './fixtures';
```

## Troubleshooting

### Test Server Not Accessible

```
Error: connect ECONNREFUSED
```

**Solution**: Ensure halos.local is accessible:
```bash
curl -k https://halos.local:9090/
```

If not accessible, update `baseURL` in `playwright.config.ts` to your test server.

### Login Fails

```
Error: Timeout waiting for selector 'nav a:has-text("Overview")'
```

**Solution**:
- Verify user credentials in `e2e/fixtures.ts`
- Check that the user exists on the test server
- Ensure Cockpit is running

### Module Not Found

```
Error: Timeout waiting for selector '[role="tab"]:has-text("Search")'
```

**Solution**:
- Ensure cockpit-apt is installed on the test server
- Verify the module loads at `https://halos.local:9090/apt`
- Check browser console for errors (run with `--headed`)

### Tests Fail in Headless Mode

Run with visible browser to debug:

```bash
npx playwright test --headed
```

### View Test Results

Playwright generates an HTML report on failure:

```bash
npx playwright show-report
```

## Best Practices

### Writing New Tests

1. **Use the fixture**: Import from `./fixtures` for auto-login
2. **Wait for elements**: Use `toBeVisible()` with timeout
3. **Descriptive selectors**: Use role/text selectors over CSS
4. **Test user behavior**: Click, type, navigate like a real user
5. **Verify outcomes**: Check visible UI changes, not internal state

### Example Test

```typescript
import { test, expect } from './fixtures';

test('should search for packages', async ({ page }) => {
  // Find search input
  const searchInput = page.locator('input[placeholder*="Search"]');

  // Type query
  await searchInput.fill('nginx');

  // Wait for debounced search
  await page.waitForTimeout(500);

  // Verify results visible
  await expect(page.locator('text=nginx').first()).toBeVisible();
});
```

## CI Integration

The configuration includes CI-specific settings:

- `forbidOnly: !!process.env.CI` - Fails if test.only is committed
- `retries: process.env.CI ? 2 : 0` - Retries tests on CI only

To run in CI mode:

```bash
CI=true npm run test:e2e
```

## Performance

- **Parallel execution**: Tests run in parallel for speed
- **Fast feedback**: ~30 seconds for full suite
- **Selective runs**: Use `-g` flag to run specific tests during development

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Frontend Testing Guide](../README.md#testing)
- [Cockpit Development Guide](https://cockpit-project.org/guide/latest/)
