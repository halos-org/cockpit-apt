#!/usr/bin/env node
/**
 * Inspect the actual HTML structure
 */
const playwright = require('playwright');

(async () => {
  console.log('🔍 Inspecting HTML structure...\n');

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

    // Check APT
    await page.goto('https://halos.local:9090/apt', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    const aptStructure = await page.evaluate(() => {
      const app = document.querySelector('#app');
      return app ? app.innerHTML.substring(0, 500) : 'NOT FOUND';
    });

    console.log('APT Structure:');
    console.log(aptStructure);
    console.log('\n---\n');

    // Check Storage for comparison
    await page.goto('https://halos.local:9090/storage', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    const storageStructure = await page.evaluate(() => {
      const content = document.querySelector('main') || document.querySelector('.ct-content');
      return content ? content.innerHTML.substring(0, 500) : 'NOT FOUND';
    });

    console.log('Storage Structure:');
    console.log(storageStructure);

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
