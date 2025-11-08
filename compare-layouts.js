#!/usr/bin/env node
const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  try {
    await page.goto('https://halos.local:9090/', { waitUntil: 'networkidle', timeout: 10000 });
    await page.fill('#login-user-input', 'claude');
    await page.fill('#login-password-input', 'claude123');
    await page.click('#login-button');
    await page.waitForTimeout(2000);

    // Capture Package Manager
    console.log('📸 Capturing Package Manager...');
    await page.goto('https://halos.local:9090/packagemanager', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/packagemanager-view.png', fullPage: true });
    console.log('Saved: /tmp/packagemanager-view.png');

    // Capture APT
    console.log('📸 Capturing APT...');
    await page.goto('https://halos.local:9090/apt', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/apt-view.png', fullPage: true });
    console.log('Saved: /tmp/apt-view.png');

    // Capture Storage
    console.log('📸 Capturing Storage...');
    await page.goto('https://halos.local:9090/storage', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/storage-view-new.png', fullPage: true });
    console.log('Saved: /tmp/storage-view-new.png');

    console.log('\n✅ Compare:');
    console.log('  - /tmp/packagemanager-view.png');
    console.log('  - /tmp/apt-view.png');
    console.log('  - /tmp/storage-view-new.png');

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
