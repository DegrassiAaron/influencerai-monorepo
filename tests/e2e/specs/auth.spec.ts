import puppeteer from 'puppeteer';
const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';

test('auth flow', async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.type('[data-testid="username"]', 'demo');
  await page.type('[data-testid="password"]', 'demo');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click('[data-testid="submit"]'),
  ]);
  await browser.close();
}, 45000);
