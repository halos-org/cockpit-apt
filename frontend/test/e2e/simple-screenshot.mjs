// Simple screenshot test
//
// Environment variables:
//   COCKPIT_TEST_HOST - Required. The test host (e.g., myhostname.local:9090)
import { chromium } from 'playwright';

const testHost = process.env.COCKPIT_TEST_HOST;
if (!testHost) {
  console.error('Error: COCKPIT_TEST_HOST environment variable is required.');
  console.error('Set it to your Cockpit host, e.g.: export COCKPIT_TEST_HOST=myhostname.local:9090');
  process.exit(1);
}
const baseUrl = `https://${testHost}`;

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  console.log(`Loading ${baseUrl}/apt...`);

  try {
    await page.goto(`${baseUrl}/apt`, { waitUntil: 'load', timeout: 10000 });

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
