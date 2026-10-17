import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('rela-theme', 'dark'));
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const h = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('page height', h);
// sample colors down the page
const colors = await page.evaluate(async () => {
  const out = [];
  const targets = [900, 1150, 1250, 1350, 1450];
  window.scrollTo(0, 0);
  for (const y of targets) {
    const el = document.elementFromPoint(195, y - window.scrollY);
    out.push({ y, tag: el?.tagName, cls: (el?.className || '').toString().slice(0, 80),
      bg: el ? getComputedStyle(el).backgroundColor : null });
  }
  return out;
});
console.log(JSON.stringify(colors, null, 2));
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/m5-band.png' });
await browser.close();
