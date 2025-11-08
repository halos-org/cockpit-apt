#!/usr/bin/env node
/**
 * Capture Storage page layout for comparison
 */
const playwright = require('playwright');

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
    await page.goto('https://halos.local:9090/', {
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
    await page.goto('https://halos.local:9090/storage', {
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
