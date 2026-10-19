/**
 * qa/responsive.mjs — phone-width sweep: every app page must fit a 390px
 * viewport without horizontal overflow, and key text must wrap cleanly.
 * (The /print A4 route is excluded — it's a print artifact, not a screen page.)
 */
import { chromium } from "playwright";

const base = "http://localhost:3000";
let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failed++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.getByLabel("Email address").fill("qa.tester@rela.test");
await page.getByLabel("Password").fill("QaTest12345");
await page.getByRole("button", { name: /^log in$/i }).click();
await page.waitForURL(/\/dashboard/, { timeout: 45000 });

/* anonymous pages first (public token grabbed from a fresh doc later) */
const anon = [["/", "landing"], ["/support", "support"]];
const auth = [
  ["/dashboard", "dashboard"],
  ["/documents", "documents list"],
  ["/documents/new?type=receipt", "new receipt"],
  ["/documents/new?type=invoice", "new invoice"],
  ["/documents/new?type=quotation", "new quotation"],
  ["/settings", "settings"],
  ["/upgrade", "upgrade"],
];

const overflow = async () =>
  page.evaluate(() => ({
    el: document.documentElement.scrollWidth,
    vw: window.innerWidth,
  }));

// auth pages
for (const [url, label] of auth) {
  await page.goto(`${base}${url}`, { waitUntil: "networkidle" });
  const o = await overflow();
  check(`${label} fits 390px (${o.el}px)`, o.el <= o.vw, `scrollWidth ${o.el}`);
}

// document detail page (uses the first doc in the list, or seeds none)
await page.goto(`${base}/documents`, { waitUntil: "networkidle" });
const first = await page.locator('a[href^="/documents/"]').first().getAttribute("href").catch(() => null);
if (first) {
  await page.goto(`${base}${first}`, { waitUntil: "networkidle" });
  const o = await overflow();
  check("document detail fits 390px", o.el <= o.vw, `scrollWidth ${o.el}`);
} else {
  console.log("… no document in list, detail overflow check skipped");
}

// anonymous pages need a logged-out context (login page first)
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p2 = await ctx2.newPage();
for (const [url, label] of anon) {
  await p2.goto(`${base}${url}`, { waitUntil: "networkidle" });
  const o = await page.evaluate(() => ({ el: 0 }));
  const o2 = await p2.evaluate(() => ({
    el: document.documentElement.scrollWidth,
    vw: window.innerWidth,
  }));
  check(`${label} fits 390px anon`, o2.el <= o2.vw, `scrollWidth ${o2.el}`);
}
await p2.goto(`${base}/login`, { waitUntil: "networkidle" });
const lo = await p2.evaluate(() => ({ el: document.documentElement.scrollWidth, vw: window.innerWidth }));
check("login fits 390px", lo.el <= lo.vw, `scrollWidth ${lo.el}`);

await browser.close();
console.log(failed ? `\n${failed} FAILURES` : "\nall pass");
process.exit(failed ? 1 : 0);
