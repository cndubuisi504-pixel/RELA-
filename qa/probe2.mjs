import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
const out = await page.evaluate(() => {
  const h = [...document.querySelectorAll('h2')].find((n) => n.textContent.includes('One For All'));
  const p = h.parentElement.querySelector('p.lede');
  const fmt = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height),
      mt: cs.marginTop, mb: cs.marginBottom, lh: cs.lineHeight, fs: cs.fontSize, pos: cs.position, disp: cs.display };
  };
  return { h: fmt(h), p: fmt(p), parent: fmt(h.parentElement) };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
