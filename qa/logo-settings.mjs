/**
 * qa/logo-settings.mjs — verify business logo upload, replace, and removal in Settings.
 */
import fs from "node:fs";
import { chromium } from "playwright";

process.loadEnvFile(".env.local");
const base = "http://localhost:3000";
const SUPA = "https://zglkbrivfkabmlhrllbf.supabase.co";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QA_UID = "509a7f5e-1354-4282-ba9b-ccf18d907b01";
const QA_BIZ = "224a87f0-5294-4ae1-bd81-86da8ed685ba";

const rest = async (path, init = {}) => {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SERVICE}`,
      apikey: SERVICE,
      Prefer: "return=representation",
      ...init.headers,
    },
  });
  return { status: r.status, ok: r.ok, body: await r.json().catch(() => null) };
};

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failed++;
};

// Create a small 1x1 valid PNG for testing
const testPng1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const testPngPath1 = "/tmp/test-logo-1.png";
fs.writeFileSync(testPngPath1, testPng1);

const testPng2 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M9QzwAEjAwMDAwAFAcCARgqg+IAAAAASUVORK5CYII=",
  "base64",
);
const testPngPath2 = "/tmp/test-logo-2.png";
fs.writeFileSync(testPngPath2, testPng2);

const original = (await rest(`businesses?id=eq.${QA_BIZ}&select=logo_url,signature_url`)).body[0];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill("qa.tester@rela.test");
  await page.getByLabel("Password").fill("QaTest12345");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });

  await page.goto(`${base}/settings`, { waitUntil: "networkidle" });

  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

  check("Branding section exists in Settings", (await page.getByText(/Business logo & signature/i).count()) > 0);

  // 1. Upload logo
  const logoInput = page.locator('input[aria-label="Upload business logo"]');
  check("Logo file input found", (await logoInput.count()) > 0);

  await logoInput.setInputFiles(testPngPath1);
  await page.waitForSelector("text=Uploaded", { timeout: 15000 });
  check("Logo upload indicates success", (await page.getByText("Uploaded").count()) > 0);

  // Check DB
  const dbAfterUpload = (await rest(`businesses?id=eq.${QA_BIZ}&select=logo_url`)).body[0];
  check("DB has logo_url set", !!dbAfterUpload.logo_url && dbAfterUpload.logo_url.includes("branding"));

  // 2. Replace logo
  await logoInput.setInputFiles(testPngPath2);
  await page.waitForTimeout(2000);
  const dbAfterReplace = (await rest(`businesses?id=eq.${QA_BIZ}&select=logo_url`)).body[0];
  check(
    "DB has updated logo_url after replace",
    !!dbAfterReplace.logo_url && dbAfterReplace.logo_url !== dbAfterUpload.logo_url,
    `${dbAfterReplace.logo_url} vs ${dbAfterUpload.logo_url}`,
  );

  // 3. Remove logo
  const removeBtn = page.getByRole("button", { name: /^remove$/i }).first();
  check("Remove button exists", (await removeBtn.count()) > 0);
  await removeBtn.click();
  await page.waitForTimeout(3000);

  await page.waitForSelector("text=Tap to upload your logo", { timeout: 15000 });
  check("UI reverted to empty upload prompt", (await page.getByText("Tap to upload your logo").count()) > 0);

  // Check DB after remove
  const dbAfterRemove = (await rest(`businesses?id=eq.${QA_BIZ}&select=logo_url`)).body[0];
  check("DB logo_url is null after remove", dbAfterRemove.logo_url === null, JSON.stringify(dbAfterRemove));
} finally {
  await browser.close();
  // Restore original state
  await rest(`businesses?id=eq.${QA_BIZ}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(original),
  });
  if (fs.existsSync(testPngPath1)) fs.unlinkSync(testPngPath1);
  if (fs.existsSync(testPngPath2)) fs.unlinkSync(testPngPath2);
}

console.log(failed ? `\n${failed} FAILURES` : "\nall pass");
process.exit(failed ? 1 : 0);
