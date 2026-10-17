import { chromium } from 'playwright';
const browser = await chromium.launch();

async function shot(name, opts) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem('rela-theme', t), opts.theme || 'light');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  if (opts.selector) {
    await page.locator(opts.selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.locator(opts.selector).screenshot({ path: `/tmp/${name}.png` });
  } else {
    await page.screenshot({ path: `/tmp/${name}.png`, clip: opts.clip });
  }
  await ctx.close();
  console.log(name);
}

await shot('z-hero', { selector: 'section:has(h1)' });
await shot('z-stack-closed', { selector: '#one-for-all' });
await shot('z-footer', { selector: 'footer' });
await shot('z-pricedark', { selector: '#pricing', theme: 'dark' });
await shot('z-mark', { selector: 'header a[aria-label]', clip: { x: 140, y: 8, width: 220, height: 60 } });
await browser.close();
