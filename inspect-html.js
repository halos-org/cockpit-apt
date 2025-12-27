#!/usr/bin/env node
/**
 * Inspect the actual HTML structure
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
  console.log('🔍 Inspecting HTML structure...\n');

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.fill('#login-user-input', 'claude');
    await page.fill('#login-password-input', 'claude123');
    await page.click('#login-button');
    await page.waitForTimeout(2000);

    // Check APT
    await page.goto(`${baseUrl}/apt`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    const aptStructure = await page.evaluate(() => {
      const app = document.querySelector('#app');
      return app ? app.innerHTML.substring(0, 500) : 'NOT FOUND';
    });

    console.log('APT Structure:');
    console.log(aptStructure);
    console.log('\n---\n');

    // Check Storage for comparison
    await page.goto(`${baseUrl}/storage`, { waitUntil: 'networkidle', timeout: 10000 });
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
