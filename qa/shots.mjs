/**
 * Visual QA: captures the landing page at desktop and mobile, in both themes.
 * Requires a running dev server and Playwright installed separately:
 *   npm i -D playwright && npx playwright install chromium
 *   node qa/shots.mjs
 */
import { chromium } from "playwright";

const base = process.env.QA_BASE ?? "http://localhost:3000";
const browser = await chromium.launch();

const shots = [
  { name: "desktop-light", vp: { width: 1440, height: 1000 }, theme: "light", full: true },
  { name: "desktop-dark", vp: { width: 1440, height: 1000 }, theme: "dark", full: true },
  { name: "mobile-light", vp: { width: 390, height: 844 }, theme: "light", full: true },
  { name: "mobile-dark", vp: { width: 390, height: 844 }, theme: "dark", full: true },
];

for (const s of shots) {
  const ctx = await browser.newContext({ viewport: s.vp });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem("rela-theme", t), s.theme);
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `/tmp/${s.name}.png`, fullPage: s.full });
  await ctx.close();
  console.log("captured", s.name);
}

await browser.close();
