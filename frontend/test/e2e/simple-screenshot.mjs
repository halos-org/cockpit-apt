// Simple screenshot test
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  console.log('Loading https://halos.local:9090/apt...');

  try {
    await page.goto('https://halos.local:9090/apt', { waitUntil: 'load', timeout: 10000 });

    await page.screenshot({ path: '/tmp/apt-page.png', fullPage: true });
    console.log('Screenshot saved to /tmp/apt-page.png');

    const title = await page.title();
    console.log('Page title:', title);

    const cssLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
    });
    console.log('CSS links:', cssLinks);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/apt-error.png' });
    console.log('Error screenshot saved to /tmp/apt-error.png');
  } finally {
    await browser.close();
  }
})();
