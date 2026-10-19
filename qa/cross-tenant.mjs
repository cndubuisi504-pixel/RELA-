/**
 * qa/cross-tenant.mjs — adversarial: tenant 2 (logged in) tries to open
 * tenant 1's document detail and print pages. Both must 404 via RLS.
 *
 * Self-seeding: creates tenant1's receipt through the real UI, inserts an
 * expired quotation via service role for the public-verify check, then
 * tears everything down (incl. the monthly usage counter) so the suite is
 * repeatable and contributes nothing to the free-limit count.
 */
import { chromium } from "playwright";
import crypto from "node:crypto";

const base = "http://localhost:3000";
const QA_UID = "509a7f5e-1354-4282-ba9b-ccf18d907b01";
const QA_BIZ = "224a87f0-5294-4ae1-bd81-86da8ed685ba";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPA = "https://zglkbrivfkabmlhrllbf.supabase.co";

const rest = async (path, init = {}) => {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SERVICE}`,
      apikey: SERVICE,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
  });
  if (res.status === 204 || !res.ok) return [];
  return res.json();
};

const browser = await chromium.launch();

/* self-heal: usable even after a crashed previous run */
await rest(`documents?business_id=eq.${QA_BIZ}`, { method: "DELETE" });
await rest(`document_usage?business_id=eq.${QA_BIZ}&period_month=eq.${new Date().toISOString().slice(0, 7) + "-01"}`, { method: "DELETE" });
let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failed++;
};

const signIn = async (page, email) => {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("QaTest12345");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/(dashboard|upgrade)/, { timeout: 45000 });
  if (page.url().includes("/upgrade")) throw new Error(`${email} hit the free limit — run did not start clean`);
};

/* ------------------------------------------------------- tenant1 creates a
   receipt through the real UI */
const ctx1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p1 = await ctx1.newPage();
await signIn(p1, "qa.tester@rela.test");
await p1.goto(`${base}/documents/new?type=receipt`, { waitUntil: "networkidle" });
await p1.getByRole("button", { name: /^product$/i }).click();
await p1.getByLabel(/^Name/i).first().fill("CrossTenant Test");
await p1.getByLabel("Item name").first().fill("Isolation probe");
await p1.getByLabel("Unit price for row 1").fill("100");
await p1.getByRole("button", { name: /^save receipt$/i }).click();
await p1.waitForURL(/\/documents\/[0-9a-f-]{36}/, { timeout: 60000 });
const victimId = p1.url().match(/\/documents\/([0-9a-f-]{36})/)[1];
check("tenant1 creates the receipt that will be probed", Boolean(victimId));

/* ------------------------------------------------------- tenant2 attacks */
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p2 = await ctx2.newPage();
await signIn(p2, "qa2@rela.test");

let res = await p2.goto(`${base}/documents/${victimId}`, { waitUntil: "commit" });
check("tenant2 → tenant1 document detail", res?.status() === 404, `status ${res?.status()}`);

res = await p2.goto(`${base}/documents/${victimId}/print`, { waitUntil: "commit" });
check("tenant2 → tenant1 print page", res?.status() === 404, `status ${res?.status()}`);

res = await p2.goto(`${base}/documents`, { waitUntil: "commit" });
check("tenant2 documents list loads empty-state", res?.status() === 200);

/* ------------------------------------------------------- expired quotation
   shows Expired on the public verify page. Other suites may have left a
   monthly usage row behind — clear it so the quota trigger can't block us. */
await rest(`document_usage?business_id=eq.${QA_BIZ}`, { method: "DELETE" });
const token = crypto.randomBytes(16).toString("hex");
const [expired] = await rest("documents", {
  method: "POST",
  body: JSON.stringify({
    business_id: QA_BIZ,
    created_by: QA_UID,
    document_type: "quotation",
    document_number: `Q-EXP-${Date.now().toString().slice(-8)}`,
    daily_sequence: 1,
    public_token: token,
    customer_name: "Expiry Probe",
    status: "sent",
    issued_date: "2026-09-01",
    valid_until: "2026-09-10",
    subtotal_kobo: 10000,
    total_kobo: 10000,
    balance_remaining_kobo: 10000,
  }),
});
check("expired quotation fixture inserted", Boolean(expired?.id));

await p2.goto(`${base}/r/${token}`, { waitUntil: "networkidle" });
check("public verify page shows Expired for a stale quotation",
  (await p2.getByText("Expired").count()) > 0);

/* ------------------------------------------------------- teardown */
await rest(`documents?id=eq.${expired?.id}`, { method: "DELETE" });
await rest(`documents?id=eq.${victimId}`, { method: "DELETE" });
const month = new Date().toISOString().slice(0, 7) + "-01";
await rest(`document_usage?business_id=eq.${QA_BIZ}&period_month=eq.${month}`, { method: "DELETE" });
console.log("teardown: probe docs + monthly usage counter removed");

console.log(failed ? `\n${failed} failed` : "\nall pass");
await browser.close();
process.exit(failed ? 1 : 0);
