import fs from "node:fs";
import { chromium } from "playwright";

process.loadEnvFile(".env.local");
const base = process.env.QA_BASE_URL || "https://rela-ng.vercel.app";
const SUPA = "https://zglkbrivfkabmlhrllbf.supabase.co";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QA_BIZ = "224a87f0-5294-4ae1-bd81-86da8ed685ba";

const rest = async (path, init = {}) => {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, Prefer: "return=representation", ...init.headers },
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};

const original = (await rest(`businesses?id=eq.${QA_BIZ}&select=logo_url`)).body[0];

const testPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const testPath = "/tmp/header-test-logo.png";
fs.writeFileSync(testPath, testPng);

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failed++;
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill("qa.tester@rela.test");
  await page.getByLabel("Password").fill("QaTest12345");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });

  // 1. Initial state (no logo) -> shows initials
  const avatar = page.locator('header a[href="/settings"]');
  check("Initial avatar shows initials", (await avatar.innerText()).trim() === "QT");
  check("Initial avatar has no img", (await avatar.locator("img").count()) === 0);

  // 2. Go to settings and upload a logo
  await page.goto(`${base}/settings`, { waitUntil: "networkidle" });
  const logoInput = page.locator('input[aria-label="Upload business logo"]');
  await logoInput.setInputFiles(testPath);
  await page.waitForSelector("text=Uploaded", { timeout: 15000 });

  // 3. Navigate back to dashboard -> avatar must now show the uploaded image
  await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
  const newAvatar = page.locator('header a[href="/settings"]');
  const imgCount = await newAvatar.locator("img").count();
  check("Header avatar shows uploaded logo <img>", imgCount === 1);
  const src = await newAvatar.locator("img").getAttribute("src");
  check("Header avatar img src points to branding bucket", !!src && src.includes("branding"), src);

  // 4. Open drawer menu -> verify menu also displays the logo
  await page.locator('header button[aria-label="Open menu"]').click();
  await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
  const drawerLogo = page.locator('div[role="dialog"] img');
  check("Drawer menu displays uploaded logo", (await drawerLogo.count()) >= 1);
} finally {
  await browser.close();
  await rest(`businesses?id=eq.${QA_BIZ}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(original),
  });
  if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
}

console.log(failed ? `\n${failed} FAILURES` : "\nall pass");
process.exit(failed ? 1 : 0);
