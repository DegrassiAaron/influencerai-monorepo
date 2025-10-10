import puppeteer from 'puppeteer';

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';

test('home->login', async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.click('[data-testid="link-login"]');
  await page.waitForSelector('[data-testid="submit"]');
  await browser.close();
}, 30000);
