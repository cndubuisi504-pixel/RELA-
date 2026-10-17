import { chromium } from 'playwright';

const pagesToCheck = ['/', '/api-docs', '/support', '/terms', '/privacy', '/signup', '/nope'];

function lum(hex) {
  const c = hex.match(/\w\w/g).map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return +((l1 + 0.05) / (l2 + 0.05)).toFixed(2);
};

const pairs = {
  light: {
    'ink on canvas': ['#161316', '#fafbf6'],
    'ink-2 on canvas': ['#5e564e', '#fafbf6'],
    'ink-3 on canvas': ['#6e655c', '#fafbf6'],
    'ink-3 on surface': ['#6e655c', '#ffffff'],
    'white on primary (button)': ['#161316', '#ff6d29'],
    'accent-text on canvas': ['#b4430f', '#fafbf6'],
    'accent-text on primary-soft': ['#b4430f', '#fff1e8'],
    'success on success-bg': ['#16794a', '#e8f6ef'],
    'warning on warning-bg': ['#8a5a00', '#fff6e0'],
    'invert-text on invert-bg': ['#fafbf6', '#161316'],
    'invert-muted on invert-bg': ['#b3aca6', '#161316'],
    'white on invert (footer link hover)': ['#f5f1e6', '#161316'],
  },
  dark: {
    'ink on canvas': ['#fafbf6', '#161316'],
    'ink-2 on canvas': ['#bababa', '#161316'],
    'ink-3 on canvas': ['#8e8681', '#161316'],
    'ink-2 on surface': ['#bababa', '#201b18'],
    'ink-3 on surface': ['#8e8681', '#201b18'],
    'ink on primary (button)': ['#161316', '#ff6d29'],
    'accent-text on canvas': ['#ff9a66', '#161316'],
    'accent-text on primary-soft': ['#ff9a66', '#2e1e15'],
    'success on success-bg': ['#5ed79e', '#12281e'],
    'warning on warning-bg': ['#f0be5e', '#2a2110'],
    'invert-muted on invert-bg': ['#c4bcb5', '#241e1a'],
    'cocoa-chip fallback on surface-2': ['#fafbf6', '#2a2421'],
  },
};

let fail = 0;
for (const [theme, list] of Object.entries(pairs)) {
  for (const [name, [fg, bg]] of Object.entries(list)) {
    const r = ratio(fg, bg);
    const ok = r >= 4.5;
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${theme.padEnd(5)} ${String(r).padStart(5)}  ${name}`);
  }
}
console.log(`\ncontrast failures: ${fail}\n`);

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const path of pagesToCheck) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await page.addInitScript((t) => localStorage.setItem('rela-theme', t), theme);
    const res = await page.goto('http://localhost:3000' + path, { waitUntil: 'networkidle' });
    const report = await page.evaluate(() => {
      const issues = [];
      // headings
      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => h.offsetParent !== null || h.getClientRects().length);
      const h1s = hs.filter((h) => h.tagName === 'H1');
      if (h1s.length > 1) issues.push({ type: 'multiple-h1', detail: h1s.length });
      let prev = 0;
      for (const h of hs) {
        const lvl = +h.tagName[1];
        if (prev && lvl > prev + 1) issues.push({ type: 'heading-skip', detail: `${h.tagName} after H${prev}: ${h.textContent.trim().slice(0, 40)}` });
        prev = lvl;
      }
      // images without alt
      for (const img of document.querySelectorAll('img')) {
        if (!img.hasAttribute('alt')) issues.push({ type: 'img-no-alt', detail: img.src.slice(-40) });
      }
      // buttons/links without accessible name
      for (const el of document.querySelectorAll('a, button')) {
        const name = (el.getAttribute('aria-label') || el.textContent || '').trim();
        if (!name) issues.push({ type: 'no-accessible-name', detail: el.outerHTML.slice(0, 70) });
      }
      // form fields without labels
      for (const el of document.querySelectorAll('input, select, textarea')) {
        const id = el.id;
        const labelled = (id && document.querySelector(`label[for="${id}"]`)) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
        if (!labelled) issues.push({ type: 'field-no-label', detail: el.outerHTML.slice(0, 60) });
      }
      // landmarks
      if (!document.querySelector('main')) issues.push({ type: 'no-main' });
      // target sizes (mobile-ish heuristic, ignore inline text links inside prose)
      for (const el of document.querySelectorAll('a, button, summary')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const inProse = !!el.closest('.legal-prose, p, li');
        if (r.height < 44 && !inProse) issues.push({ type: 'small-target', detail: `${el.tagName} "${(el.textContent || '').trim().slice(0, 28)}" ${Math.round(r.width)}x${Math.round(r.height)}` });
      }
      return { issues, title: document.title };
    });
    const uniq = [...new Map(report.issues.map((i) => [i.type + i.detail, i])).values()];
    console.log(`\n[${theme}] ${path} → ${res.status()}  ${uniq.length ? '' : 'no issues'}`);
    for (const i of uniq) console.log('   -', i.type, '|', i.detail);
    await ctx.close();
  }
}
await browser.close();
