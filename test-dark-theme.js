#!/usr/bin/env node
/**
 * Test dark theme support
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
  console.log('🌙 Testing dark theme...\n');

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

    // Navigate to APT (light theme by default)
    console.log('📸 Capturing light theme...');
    await page.goto(`${baseUrl}/apt`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/apt-light.png', fullPage: true });
    console.log('Saved: /tmp/apt-light.png');

    // Switch to dark theme
    console.log('🌙 Switching to dark theme...');
    await page.evaluate(() => {
      localStorage.setItem('shell:style', 'dark');
      window.dispatchEvent(new CustomEvent('cockpit-style', { detail: { style: 'dark' } }));
    });
    await page.waitForTimeout(500);

    await page.screenshot({ path: '/tmp/apt-dark.png', fullPage: true });
    console.log('Saved: /tmp/apt-dark.png');

    // Switch back to light
    console.log('☀️  Switching back to light...');
    await page.evaluate(() => {
      localStorage.setItem('shell:style', 'light');
      window.dispatchEvent(new CustomEvent('cockpit-style', { detail: { style: 'light' } }));
    });
    await page.waitForTimeout(500);

    await page.screenshot({ path: '/tmp/apt-light-2.png', fullPage: true });
    console.log('Saved: /tmp/apt-light-2.png');

    console.log('\n✅ Done! Compare:');
    console.log('  - /tmp/apt-light.png');
    console.log('  - /tmp/apt-dark.png');

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
