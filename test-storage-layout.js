#!/usr/bin/env node
/**
 * Capture Storage page layout for comparison
 *
 * Environment variables:
 *   COCKPIT_TEST_HOST - Required. The test host (e.g., myhostname.local:9090)
 */
const playwright = require('playwright');

const testHost = process.env.COCKPIT_TEST_HOST;
if (!testHost) {
  console.error('Error: COCKPIT_TEST_HOST environment variable is required.');
  console.error('Set it to your Cockpit host, e.g.: export COCKPIT_TEST_HOST=myhostname.local:9090');
  process.exit(1);
}
const baseUrl = `https://${testHost}`;

(async () => {
  console.log('📸 Capturing Storage page layout...\n');

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to login page...');
    await page.goto(`${baseUrl}/`, {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    // Login
    console.log('🔐 Logging in...');
    await page.fill('#login-user-input', 'claude');
    await page.fill('#login-password-input', 'claude123');
    await page.click('#login-button');
    await page.waitForTimeout(2000);

    // Navigate to Storage
    console.log('📍 Navigating to Storage...');
    await page.goto(`${baseUrl}/storage`, {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/storage-view.png', fullPage: true });
    console.log('📸 Screenshot saved: /tmp/storage-view.png');

    console.log('\n✅ Done! Compare /tmp/storage-view.png with /tmp/initial-view.png');

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png' });
    console.log('📸 Error screenshot saved: /tmp/error-screenshot.png');
  } finally {
    await browser.close();
  }
})();
