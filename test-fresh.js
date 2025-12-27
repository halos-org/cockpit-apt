#!/usr/bin/env node
/**
 * Test cockpit-apt layout with cache clearing
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
  console.log('🧪 Testing cockpit-apt layout (cache cleared)...\n');

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

    // Navigate to APT with cache bypass
    console.log('📍 Navigating to APT (bypassing cache)...');
    await page.goto(`${baseUrl}/apt`, {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    // Force reload to bypass cache
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/apt-fresh.png', fullPage: true });
    console.log('📸 Screenshot saved: /tmp/apt-fresh.png');

    console.log('\n✅ Done!');

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/apt-error.png' });
    console.log('📸 Error screenshot saved: /tmp/apt-error.png');
  } finally {
    await browser.close();
  }
})();
