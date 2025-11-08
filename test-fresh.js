#!/usr/bin/env node
/**
 * Test cockpit-apt layout with cache clearing
 */
const playwright = require('playwright');

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

    // Navigate to APT with cache bypass
    console.log('📍 Navigating to APT (bypassing cache)...');
    await page.goto('https://halos.local:9090/apt', {
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
