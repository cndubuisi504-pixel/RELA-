import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const info = await page.evaluate(() => {
  const out = {};
  const avatar = document.querySelector('figure div.rounded-xl');
  if (avatar) {
    const cs = getComputedStyle(avatar);
    out.avatar = { text: avatar.textContent, color: cs.color, bg: cs.backgroundColor, font: cs.fontFamily, w: avatar.getBoundingClientRect().width,
      rootVar: getComputedStyle(document.documentElement).getPropertyValue('--cocoa'),
      colorVar: getComputedStyle(avatar).getPropertyValue('--color-cocoa') };
  }
  const h = [...document.querySelectorAll('h2')].find((n) => n.textContent.includes('Pricing that'));
  if (h) {
    const r = document.createRange();
    out.pricing = { font: getComputedStyle(h).fontFamily, size: getComputedStyle(h).fontSize, text: h.textContent };
    const words = [];
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const text = n.textContent;
      let i = 0;
      while (i < text.length) {
        const m = /\S+/.exec(text.slice(i));
        if (!m) break;
        const start = i + m.index;
        r.setStart(n, start); r.setEnd(n, start + m[0].length);
        const b = r.getBoundingClientRect();
        words.push({ w: m[0], top: Math.round(b.top), left: Math.round(b.left), h: Math.round(b.height) });
        i = start + m[0].length;
      }
    }
    out.pricing.words = words;
  }
  const fonts = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`);
  out.fonts = fonts;
  return out;
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
