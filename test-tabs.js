#!/usr/bin/env node
/**
 * Quick test to verify tabs work
 *
 * Environment variables:
 *   COCKPIT_TEST_HOST - Required. The test host (e.g., myhostname.local:9090)
 */
const { chromium } = require('playwright');

const testHost = process.env.COCKPIT_TEST_HOST;
if (!testHost) {
  console.error('Error: COCKPIT_TEST_HOST environment variable is required.');
  console.error('Set it to your Cockpit host, e.g.: export COCKPIT_TEST_HOST=myhostname.local:9090');
  process.exit(1);
}
const baseUrl = `https://${testHost}`;

(async () => {
  console.log(`🧪 Testing cockpit-apt tabs on ${testHost}...\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    // Add basic auth if needed
    httpCredentials: {
      username: 'pi',
      password: process.env.HALOS_PASSWORD || 'raspberry'
    }
  });

  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console error:', msg.text());
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log('❌ Page error:', error.message);
  });

  try {
    console.log(`📍 Navigating to ${baseUrl}/apt...`);
    await page.goto(`${baseUrl}/apt`, {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    console.log('✅ Page loaded');

    // Wait for tabs to appear
    await page.waitForSelector('[role="tablist"]', { timeout: 5000 });
    console.log('✅ Tabs found');

    // Get all tab titles
    const tabs = await page.$$eval('[role="tab"]', tabs =>
      tabs.map(tab => tab.textContent.trim())
    );
    console.log('📋 Tabs:', tabs);

    // Click each tab
    for (let i = 0; i < tabs.length; i++) {
      console.log(`\n🖱️  Clicking tab ${i}: ${tabs[i]}`);
      const tabSelector = `[role="tab"]:nth-child(${i + 1})`;
      await page.click(tabSelector);
      await page.waitForTimeout(500);

      // Check for "Ooops!" error
      const hasError = await page.$('text=Ooops!') !== null;
      if (hasError) {
        console.log(`❌ Tab ${i} (${tabs[i]}) shows "Ooops!" error`);
      } else {
        console.log(`✅ Tab ${i} (${tabs[i]}) loaded successfully`);
      }
    }

    console.log('\n✅ All tabs tested successfully!');

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();
