/**
 * qa/cross-tenant.mjs — adversarial: tenant 2 (logged in) tries to open
 * tenant 1's document detail and print pages. Both must 404 via RLS.
 */
import { chromium } from "playwright";

const base = "http://localhost:3000";
const foreignId = "b721e0e6-9dca-41d9-a044-4edf8aef7610"; // Adaeze Fabrics' quotation

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failed++;
};

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.getByLabel("Email address").fill("qa2@rela.test");
await page.getByLabel("Password").fill("QaTest12345");
await page.getByRole("button", { name: /^log in$/i }).click();
await page.waitForURL(/\/(dashboard|setup)/, { timeout: 45000 });

let res = await page.goto(`${base}/documents/${foreignId}`, { waitUntil: "commit" });
check("tenant2 → tenant1 document detail", res?.status() === 404, `status ${res?.status()}`);

res = await page.goto(`${base}/documents/${foreignId}/print`, { waitUntil: "commit" });
check("tenant2 → tenant1 print page", res?.status() === 404, `status ${res?.status()}`);

res = await page.goto(`${base}/documents`, { waitUntil: "commit" });
check("tenant2 documents list loads empty-state", res?.status() === 200);

// public verify page of tenant1's expired quotation must now show Expired
await page.goto(`${base}/r/d12c9b3705b9f014a8b0729b036afc84`, { waitUntil: "networkidle" });
const expired = await page.getByText("Expired").count();
check("public verify page shows Expired for a stale quotation", expired > 0);

console.log(failed ? `\n${failed} failed` : "\nall pass");
await browser.close();
process.exit(failed ? 1 : 0);
