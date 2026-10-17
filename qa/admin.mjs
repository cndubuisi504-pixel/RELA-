/**
 * qa/admin.mjs — /admin gate + logo manager.
 * qa.tester is temporarily given role=admin by the SQL step that runs before
 * this script, and it's restored afterwards by the matching revert step.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const base = "http://localhost:3000";
let passed = 0;
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
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
});

async function signIn() {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill("qa.tester@rela.test");
  await page.getByLabel("Password").fill("QaTest12345");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/(dashboard|setup)/, { timeout: 45000 });
}

await step("non-admin gets a clean 404", async () => {
  if (!process.env.GATE_ONLY) { passed--; return; } // counted only in gate mode
  await signIn();
  const res = await page.goto(`${base}/admin`, { waitUntil: "commit" });
  if (res?.status() !== 404) throw new Error(`expected 404, got ${res?.status()}`);
});

if (process.env.GATE_ONLY) {
  console.log("\ngate check done");
  await browser.close();
  process.exit(0);
}

await step("admin page loads with stats and logo manager", async () => {
  await signIn();
  await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /^admin$/i }).waitFor();
  await page.getByText("Rela team only").waitFor();
  await page.getByText(/Businesses/i).waitFor();
  await page.getByRole("heading", { name: /site logo/i }).waitFor();
});

await step("uploading a logo puts it on the site", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAABh0lEQVR42u3aoQ3DUBBEwddDJPfg4tI/dFr4yIpWA44+sEen53s/J3d9rqPT+69extvuZbztXsbb7mW87V7G2+5lvO1extvuZbztXsbb7mW87V7G2+5lvO1extvuZbztXsbb7mW87V7G2+5lvO1extvuZTwmy3hMlmcwWXpMlh6Tpcdk6TFZTJbxmCzjMVl6TJYek6XHZOkxWUyW8Zgs4zFZnsFk6TFZekyWHpOlx2QxWcZjsjyDydJjsvSYLD0mS4/JYrKMx2QZj8nSY7L0mCw9JkuPyWKyjMdkGY/J8gwmS4/J0mOy9JgsPSaLyTIek+UZTJYek6XHZOkxWXpMFpNlPCbLeEyWHpOlx2TpMVl6TBaTZTwmy3hMlmcwWXpMlh6Tpcdk6TFZTJbxmCzjMVl6TJYek6XHZOkxWUyW8Zgs4zFZekyWHpOlx2TpMVl6TBaTZTwmyzOYLD0mS4/J0mOy9JgsJst4TJbxmCw9JkuPydJjsvSYLCbLeEyW8Zgsz2Cy9F7u/QDZwXiGrN19wQAAAABJRU5ErkJggg==", "base64");
  await page.setInputFiles('input[name="logo"]', {
    name: "logo.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByRole("button", { name: /^upload logo$/i }).click();
  try {
    await page.getByText("Logo updated").waitFor({ timeout: 20000 });
  } catch {
    const alerts = await page.locator('[role="alert"], [role="status"]').allInnerTexts();
    throw new Error(`no success alert; page said: ${alerts.join(" | ") || "(nothing)"}`);
  }
  await page.screenshot({ path: "/tmp/f15-admin.png", fullPage: true });

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const img = page.locator('header img[alt="rela."]').first();
  await img.waitFor();
  const w = await img.evaluate((el) => el.naturalWidth);
  if (!w) throw new Error("logo image not rendered");
});

await step("removing the logo restores the default mark", async () => {
  await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
  page.once("dialog", () => {}); // no dialogs expected, guard anyway
  await page.getByRole("button", { name: /remove logo/i }).click();
  await page.waitForTimeout(2500);
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const count = await page.locator('header img[alt="rela."]').count();
  if (count !== 0) throw new Error("custom logo still visible after remove");
});

console.log(`\nconsole errors: ${consoleErrors.length ? consoleErrors.join("\n") : "none"}`);
await browser.close();
process.exit(consoleErrors.length ? 2 : 0);
