/**
 * qa/lifecycle.mjs — REL-7 lifecycle + Starter analytics.
 * Relies on two seeded demo docs: QUO-20261007-0099 (valid_until passed → Expired)
 * and INV-20260917-0099 (due_date passed, ₦200k balance → Overdue), and the QA
 * profile temporarily set to Starter.
 */
import { chromium } from "playwright";

const base = "http://localhost:3000";
let passed = 0;
const consoleErrors = [];
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (e) {
    console.log(`FAIL ${name} — ${String(e).split("\n")[0]}`);
    throw e;
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
});

await step("sign in", async () => {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill("qa.tester@rela.test");
  await page.getByLabel("Password").fill("QaTest12345");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
});

await step("list shows Expired and Overdue badges", async () => {
  await page.goto(`${base}/documents`, { waitUntil: "networkidle" });
  const quo = page.locator("a", { hasText: "QUO-20261007-0099" }).first();
  await quo.getByText("Expired").waitFor();
  const inv = page.locator("a", { hasText: "INV-20260917-0099" }).first();
  await inv.getByText("Overdue").waitFor();
});

await step("expired quotation: badge + no status actions", async () => {
  await page.locator("a", { hasText: "QUO-20261007-0099" }).first().click();
  await page.waitForURL(/\/documents\//, { timeout: 30000 });
  await page.locator("article ~ *").first().waitFor();
  await page.getByText("Expired").first().waitFor();
  if (await page.getByRole("button", { name: /mark accepted/i }).count())
    throw new Error("Mark accepted still offered on an expired quotation");
});

await step("overdue invoice: badge + can still record payment", async () => {
  await page.goto(`${base}/documents`, { waitUntil: "networkidle" });
  await page.locator("a", { hasText: "INV-20260917-0099" }).first().click();
  await page.waitForURL(/\/documents\//, { timeout: 30000 });
  await page.getByText("Overdue").first().waitFor();
  await page.getByRole("button", { name: /record a payment/i }).waitFor();
});

await step("analytics: starter sees charts and top customers", async () => {
  await page.goto(`${base}/analytics`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /money collected/i }).waitFor();
  const svg = page.locator('svg[role="img"][aria-label*="Money collected"]');
  await svg.waitFor();
  const label = await svg.getAttribute("aria-label");
  if (!/October 2026: ₦[1-9]/.test(label)) throw new Error(`expected October revenue in chart data; got: ${label.slice(0, 160)}`);
  await page.getByText("Outstanding").waitFor();
  await page.getByRole("heading", { name: /top customers/i }).waitFor();
  await page.getByText(/overdue invoice/i).first().waitFor();
  await page.screenshot({ path: "/tmp/f16-analytics.png", fullPage: true });
});

console.log(`\nconsole errors: ${consoleErrors.length ? consoleErrors.join("\n") : "none"}`);
await browser.close();
process.exit(consoleErrors.length ? 2 : 0);
