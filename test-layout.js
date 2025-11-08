#!/usr/bin/env node
/**
 * Test cockpit-apt layout and take screenshots
 */
const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🧪 Testing cockpit-apt layout...\n');

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  // Listen for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      console.log('❌ Console error:', text);
      errors.push(text);
    }
  });

  page.on('pageerror', error => {
    console.log('❌ Page error:', error.message);
    errors.push(error.message);
  });

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

    // Navigate to APT
    console.log('📍 Navigating to APT...');
    await page.goto('https://halos.local:9090/apt', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    await page.waitForTimeout(2000);

    // Take screenshot of initial view
    await page.screenshot({ path: '/tmp/initial-view.png', fullPage: true });
    console.log('📸 Screenshot saved: /tmp/initial-view.png');

    // Try to find and click Sections tab
    console.log('🖱️  Looking for Sections tab...');
    const tabs = await page.locator('[role="tab"]').all();
    console.log(`Found ${tabs.length} tabs`);

    for (let i = 0; i < tabs.length; i++) {
      const text = await tabs[i].textContent();
      console.log(`  Tab ${i}: "${text}"`);
      if (text && text.includes('Sections')) {
        console.log('🖱️  Clicking Sections tab...');
        await tabs[i].click();
        await page.waitForTimeout(2000);
        break;
      }
    }

    // Take screenshot after clicking
    await page.screenshot({ path: '/tmp/sections-view.png', fullPage: true });
    console.log('📸 Screenshot saved: /tmp/sections-view.png');

    // Try to click on a section
    console.log('🖱️  Looking for gnustep section...');
    const sections = await page.locator('a, button').all();
    for (let section of sections) {
      const text = await section.textContent();
      if (text && text.toLowerCase().includes('gnustep')) {
        console.log('🖱️  Clicking gnustep...');
        await section.click();
        await page.waitForTimeout(2000);
        break;
      }
    }

    // Take screenshot of section detail
    await page.screenshot({ path: '/tmp/section-packages.png', fullPage: true });
    console.log('📸 Screenshot saved: /tmp/section-packages.png');

    // Analyze layout - just save screenshots
    console.log('\n📸 Screenshots saved to /tmp/');

    if (errors.length > 0) {
      console.log('\n❌ JavaScript errors found:');
      errors.forEach(err => console.log('  -', err));
    }

    console.log('\n✅ Test completed! Check /tmp/*.png for screenshots');

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png' });
    console.log('📸 Error screenshot saved: /tmp/error-screenshot.png');
  } finally {
    await browser.close();
  }
})();
