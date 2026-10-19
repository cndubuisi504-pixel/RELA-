import { chromium } from "playwright";

process.loadEnvFile(".env.local");
const base = process.env.QA_BASE_URL || "https://rela-iota-eight.vercel.app";
const SUPA = "https://zglkbrivfkabmlhrllbf.supabase.co";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QA_BIZ = "224a87f0-5294-4ae1-bd81-86da8ed685ba";

const rest = async (path, init = {}) => {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, ...init.headers },
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill("qa.tester@rela.test");
  await page.getByLabel("Password").fill("QaTest12345");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });

  const avatar = page.locator('header a[href="/settings"]');
  console.log("Avatar count:", await avatar.count());
  console.log("Avatar text:", (await avatar.innerText()).trim());
  const imgCount = await avatar.locator("img").count();
  console.log("Avatar img count:", imgCount);
  if (imgCount > 0) {
    console.log("Avatar img src:", await avatar.locator("img").getAttribute("src"));
  }
} finally {
  await browser.close();
}
