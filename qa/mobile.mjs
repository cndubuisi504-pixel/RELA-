import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('rela-theme', 'light'));
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/m1-hero.png' });
// horizontal overflow check
const overflow = await page.evaluate(() => {
  const d = document.documentElement;
  const wide = [...document.querySelectorAll('body *')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.right > window.innerWidth + 1 && r.width > 0;
  }).slice(0, 8).map((el) => el.tagName + '.' + (el.className || '').toString().slice(0, 60));
  return { scrollW: d.scrollWidth, clientW: d.clientWidth, wide };
});
console.log(JSON.stringify(overflow, null, 2));

// touch target audit
const small = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('a, button, summary, [role="button"]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height < 44 || r.width < 24) {
      out.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 34), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  return out;
});
console.log('small targets:', JSON.stringify(small, null, 2));

await page.getByRole('button', { name: /open menu/i }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/m2-menu.png' });
await page.getByRole('button', { name: /close menu/i }).click();

await page.locator('#one-for-all').scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/m3-stack.png' });
await page.getByRole('button', { name: /open the stack/i }).click();
await page.waitForTimeout(500);
await page.locator('#one-for-all').screenshot({ path: '/tmp/m4-stack-open.png' });
await browser.close();
