// Test CSS loading on halos.local using Playwright
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Listen to network requests
  page.on('request', request => {
    if (request.url().includes('.css') || request.url().includes('apt')) {
      console.log('REQUEST:', request.method(), request.url());
    }
  });

  page.on('response', response => {
    if (response.url().includes('.css') || response.url().includes('apt')) {
      console.log('RESPONSE:', response.status(), response.url());
    }
  });

  console.log('Loading https://halos.local:9090/...\n');

  try {
    // First login to Cockpit
    await page.goto('https://halos.local:9090/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Fill in login form
    await page.fill('#login-user-input', 'pi');
    await page.fill('#login-password-input', 'raspberry');
    await page.click('#login-button');

    // Wait for login to complete
    await page.waitForURL(/cockpit/, { timeout: 10000 });

    console.log('Logged in. Now loading /apt...\n');

    // Now navigate to apt
    await page.goto('https://halos.local:9090/apt', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('\nAPT page loaded. Checking CSS...\n');

    // Check if CSS file is loaded
    const cssLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.map(link => link.href);
    });

    console.log('CSS links in HTML:', cssLinks);

    // Check if PatternFly variables are defined
    const tokenValue = await page.evaluate(() => {
      const root = document.documentElement;
      const fontSize = getComputedStyle(root).getPropertyValue('--pf-t--global--font--size--100');
      return fontSize;
    });

    console.log('PatternFly token --pf-t--global--font--size--100:', tokenValue || 'NOT DEFINED');

    // Check body styling
    const bodyStyles = await page.evaluate(() => {
      const body = document.querySelector('body');
      return {
        backgroundColor: getComputedStyle(body).backgroundColor,
        color: getComputedStyle(body).color,
        fontFamily: getComputedStyle(body).fontFamily
      };
    });

    console.log('Body styles:', bodyStyles);

    // Take screenshot
    await page.screenshot({ path: '/tmp/apt-screenshot.png', fullPage: true });
    console.log('\nScreenshot saved to /tmp/apt-screenshot.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
