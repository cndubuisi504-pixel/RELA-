/**
 * qa/settings.mjs — the editable Settings page:
 *   business fields save & persist, bank details land on the invoice print sheet,
 *   defaults persist, password change works and can be reverted, validation bites.
 */
import { chromium } from "playwright";

const base = "http://localhost:3000";
const SUPA = "https://zglkbrivfkabmlhrllbf.supabase.co";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QA_UID = "509a7f5e-1354-4282-ba9b-ccf18d907b01";
const QA_BIZ = "224a87f0-5294-4ae1-bd81-86da8ed685ba";
const rest = (p2, init = {}) =>
  fetch(`${SUPA}/rest/v1/${p2}`, {
    ...init,
    headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, Prefer: "return=minimal", ...init.headers },
  }).then(async (r) => ({ status: r.status, body: init.method ? undefined : await r.json() }));

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failed++;
};

const browser = await chromium.launch();
async function login(p, password = "QaTest12345") {
  await p.goto(`${base}/login`, { waitUntil: "networkidle" });
  await p.getByLabel("Email address").fill("qa.tester@rela.test");
  await p.getByLabel("Password").fill(password);
  await p.getByRole("button", { name: /^log in$/i }).click();
  await p.waitForURL(/\/dashboard/, { timeout: 45000 });
}

/* snapshot current state so we can restore after */
const before = (await rest(`businesses?id=eq.${QA_BIZ}&select=name,address,phone,bank_name,bank_account_name,bank_account_number,default_mode,default_theme,default_currency`)).body[0];

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await login(page);

/* ---------------- edit & save business info ---------------- */
await page.goto(`${base}/settings`, { waitUntil: "networkidle" });
check("settings page offers the editable business form", (await page.locator('input[name="name"]').count()) > 0);
check("the old 'editing … coming in the next release' copy is gone",
  (await page.getByText(/coming in the next release/i).count()) === 0);

await page.locator('input[name="name"]').fill("QA Bench Edited");
await page.locator('input[name="address"]').fill("12 Edited Street, Surulere, Lagos");
await page.locator('input[name="bank_name"]').fill("QA Bank Nigeria");
await page.locator('input[name="bank_account_number"]').fill("0123456789");
await page.locator('input[name="bank_account_name"]').fill("QA Bench Edited");
await page.getByRole("button", { name: /^save changes$/i }).click();
await page.waitForSelector("text=/Saved — new documents/", { timeout: 15000 }).catch(() => null);
const savedTxt = await page.locator("body").innerText();
check("save shows the confirmation", /Saved — new documents/.test(savedTxt));

const after = (await rest(`businesses?id=eq.${QA_BIZ}&select=name,address,phone,bank_name,bank_account_name,bank_account_number`)).body[0];
check("business name persisted in the DB", after.name === "QA Bench Edited", after.name);
check("bank details persisted", after.bank_name === "QA Bank Nigeria" && after.bank_account_number === "0123456789");

await page.reload({ waitUntil: "networkidle" });
check("form repaints with the saved values",
  (await page.locator('input[name="name"]').inputValue()) === "QA Bench Edited");

/* ---------------- validation bites ---------------- */
await page.locator('input[name="name"]').fill("");
await page.locator('input[name="bank_account_number"]').fill("12345");
await page.getByRole("button", { name: /^save changes$/i }).click();
await page.waitForTimeout(1200);
const val = await page.locator("body").innerText();
const nameErr = /as customers know it/i.test(val);
const acctErr = /10 digits/i.test(val);
check("empty name + 5-digit account number are rejected", nameErr && acctErr,
  `nameErr=${nameErr} acctErr=${acctErr} :: ${val.slice(0, 200).replace(/\n/g, " | ")}`);

/* ---------------- bank details reach the invoice print sheet ---------------- */
await page.goto(`${base}/documents/new?type=invoice`, { waitUntil: "networkidle" });
await page.getByLabel(/^Name/i).first().fill("Bank Client");
await page.getByLabel("Item name").first().fill("Consulting");
await page.getByLabel("Unit price for row 1").fill("10000");
await page.getByRole("button", { name: /^save invoice$/i }).click();
await page.waitForURL(/\/documents\/[0-9a-f-]{36}/, { timeout: 60000 });
const invUrl = page.url().split("?")[0];
await page.goto(`${invUrl}/print?noprint=1`, { waitUntil: "networkidle" });
const sheetTxt = await page.locator(".print-sheet").innerText();
check("invoice print sheet shows the saved bank details",
  sheetTxt.includes("QA Bank Nigeria") && sheetTxt.includes("0123456789"), "bank block");

/* cleanup the probe invoice + the monthly usage row it bumped */
const invId = invUrl.split("/").pop();
await rest(`documents?id=eq.${invId}`, { method: "DELETE" });
await rest(`document_usage?business_id=eq.${QA_BIZ}&period_month=eq.${new Date().toISOString().slice(0, 7) + "-01"}`, { method: "DELETE" });

/* ---------------- password change + revert ---------------- */
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await login(p2);
await p2.goto(`${base}/settings`, { waitUntil: "networkidle" });
await p2.locator('input[name="password"]').fill("QaTest12345Temp");
await p2.locator('input[name="password_confirm"]').fill("QaTest12345Temp");
await p2.getByRole("button", { name: /update sign-in/i }).click();
await p2.waitForSelector("text=/Password updated/", { timeout: 15000 }).catch(() => null);
check("password change confirms", /Password updated/.test(await p2.locator("body").innerText()));

const ctx3 = await browser.newContext();
const p3 = await ctx3.newPage();
await login(p3, "QaTest12345Temp");
check("can sign in with the new password", true);
/* revert */
await p3.goto(`${base}/settings`, { waitUntil: "networkidle" });
await p3.locator('input[name="password"]').fill("QaTest12345");
await p3.locator('input[name="password_confirm"]').fill("QaTest12345");
await p3.getByRole("button", { name: /update sign-in/i }).click();
await p3.waitForSelector("text=/Password updated/", { timeout: 15000 }).catch(() => null);
check("password reverted for future runs", /Password updated/.test(await p3.locator("body").innerText()));

/* ---------------- restore the QA business ---------------- */
await rest(`businesses?id=eq.${QA_BIZ}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(before),
});
const restored = (await rest(`businesses?id=eq.${QA_BIZ}&select=name`)).body[0];
check("QA business restored to fixture state", restored.name === before.name, restored.name);

await browser.close();
console.log(failed ? `\n${failed} FAILURES` : "\nall pass");
process.exit(failed ? 1 : 0);
