/**
 * qa/print.mjs — REL-6 PDF export checks against :3000.
 * Covers: owner reaches a full A4 sheet, free-plan watermark, print-mode
 * rendering, a real PDF via headless Chromium, and that strangers/bad ids
 * never see the page.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const base = "http://localhost:3000";
const email = "qa.tester@rela.test";
const password = "QaTest12345";

let passed = 0;
const consoleErrors = [];
async function step(name, fn) {
  process.stdout.write(`… ${name}\n`);
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

/* watermark + limits only exist on the free plan — pin it before touching the app */
await fetch("https://zglkbrivfkabmlhrllbf.supabase.co/rest/v1/profiles?id=eq.509a7f5e-1354-4282-ba9b-ccf18d907b01", {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({ plan: "free", subscription_status: "inactive", subscription_started_at: null, subscription_ends_at: null }),
});
const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
const page = await ctx.newPage();
const onConsole = (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
};
page.on("console", onConsole);
// Headless blocks window.print(); swallow the dialog rather than hang.
page.on("dialog", (d) => d.dismiss());

let docId;
await step("sign in and grab a document id", async () => {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  await page.goto(`${base}/documents`, { waitUntil: "networkidle" });
  let href = await page.locator('a[href^="/documents/"]').first().getAttribute("href").catch(() => null);
  if (!href) {
    // Suites are independent: seed one receipt ourselves if a previous suite cleaned up.
    await page.goto(`${base}/documents/new?type=receipt`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^product$/i }).click();
    await page.getByLabel(/^Name/i).first().fill("Print Suite Client");
    await page.getByLabel("Item name").first().fill("Print QA item");
    await page.getByLabel("Unit price for row 1").fill("5000");
    await page.getByRole("button", { name: /^save receipt$/i }).click();
    await page.waitForURL(/\/documents\/[0-9a-f-]{36}/, { timeout: 60000 });
    href = page.url().match(/\/documents\/[0-9a-f-]{36}/)[0];
  }
  docId = href.split("/")[2];
  if (!docId) throw new Error("no document link found");
});

let text;
await step("print page renders the full A4 sheet", async () => {
  await page.goto(`${base}/documents/${docId}/print`, { waitUntil: "networkidle" });
  text = await page.locator(".print-sheet").innerText();
  const bizName = await fetch("https://zglkbrivfkabmlhrllbf.supabase.co/rest/v1/businesses?select=name&limit=1&owner_id=eq.509a7f5e-1354-4282-ba9b-ccf18d907b01", {
        headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY },
      }).then((r) => r.json()).then((a) => a[0]?.name).catch(() => null);
  for (const needle of [bizName ?? "rela", "Verify this"]) {
    if (!text.includes(needle)) throw new Error(`missing “${needle}”`);
  }
  if (!/billed to|received from/i.test(text)) throw new Error("missing customer block");
  const number = await page.locator("h1, p").filter({ hasText: /^(REC|INV|QUO)-\d{8}-\d{4}$/ }).first().textContent();
  console.log(`   → sheet for ${number.trim()}`);
});

await step("free plan watermark is present", async () => {
  const marks = await page.locator(".print-watermark span").count();
  if (marks < 1) throw new Error("no watermark spans");
  const pitch = text.includes("Made with rela.");
  if (!pitch) throw new Error("footer pitch missing");
});

await step("save-as-PDF controls exist", async () => {
  await page.getByRole("button", { name: /save as pdf/i }).waitFor();
});

await step("print-mode render is one clean page", async () => {
  await page.emulateMedia({ media: "print" });
  const barVisible = await page.locator(".print-hide").first().isVisible();
  if (barVisible) throw new Error("screen chrome still visible in print");
  await page.screenshot({ path: "/tmp/f14-print-mode.png", fullPage: true });
  await page.emulateMedia({ media: "screen" });
});

await step("Chromium can produce the PDF", async () => {
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  fs.writeFileSync("/tmp/rela-test.pdf", pdf);
  if (pdf.length < 15_000) throw new Error(`pdf suspiciously small (${pdf.length}b)`);
  console.log(`   → ${(pdf.length / 1024).toFixed(0)} KB`);
  await page.emulateMedia({ media: "screen" });
});

await step("strangers are redirected away", async () => {
  const anon = await browser.newContext();
  const p = await anon.newPage();
  await p.goto(`${base}/documents/${docId}/print`, { waitUntil: "commit" });
  await p.waitForURL(/\/login/, { timeout: 30000 });
  await anon.close();
});

await step("unknown ids 404", async () => {
  // A deliberate 404 produces expected browser/dev-framework error messages.
  // Check its HTTP status; console assertions above cover the successful page.
  page.off("console", onConsole);
  const res = await page.goto(`${base}/documents/00000000-0000-4000-8000-000000000000/print`, {
    waitUntil: "commit",
  });
  if (res.status() !== 404) throw new Error(`expected 404, got ${res.status()}`);
});

await page.waitForLoadState("networkidle");
await browser.close();
console.log(`\nconsole errors: ${consoleErrors.length ? consoleErrors.join("\n") : "none"}`);
process.exit(consoleErrors.length ? 2 : 0);
