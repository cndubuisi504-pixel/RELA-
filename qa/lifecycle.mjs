/** Lifecycle + Starter analytics. Self-contained fixtures; restores QA state. */
import { chromium } from "playwright";
import crypto from "node:crypto";

const base = process.env.QA_BASE_URL || "http://localhost:3000";
const SUPA = "https://zglkbrivfkabmlhrllbf.supabase.co";
const BIZ = "224a87f0-5294-4ae1-bd81-86da8ed685ba";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY to run this QA-account-only suite.");
async function rest(path, { body, ...init } = {}) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation" },
  });
  if (!r.ok) throw new Error(`QA fixture ${r.status}: ${(await r.text()).slice(0, 180)}`);
  return r.status === 204 ? null : r.json();
}
const [business] = await rest(`businesses?id=eq.${BIZ}&select=owner_id`);
const UID = business.owner_id;
const [profile] = await rest(`profiles?id=eq.${UID}&select=plan,subscription_status`);
const month = new Date().toISOString().slice(0, 7) + "-01";
const usage = await rest(`document_usage?business_id=eq.${BIZ}&period_month=eq.${month}`);
const suffix = crypto.randomBytes(5).toString("hex");
const today = new Date().toISOString().slice(0, 10);
const past = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
let fixtures = [];
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const consoleErrors = [];
page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 180)); });
async function step(name, fn) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (e) { console.log(`FAIL ${name} — ${String(e).split("\n")[0]}`); throw e; }
}
try {
  await rest(`profiles?id=eq.${UID}`, { method: "PATCH", body: { plan: "starter", subscription_status: "active" } });
  const common = { business_id: BIZ, created_by: UID, customer_name: `Lifecycle QA ${suffix}`, issued_date: today, daily_sequence: 99, mode: "service", show_quantity: false, quantity_label: "qty", currency: "NGN", visibility: "link", subtotal_kobo: 20000000, total_kobo: 20000000, amount_paid_kobo: 0, balance_remaining_kobo: 20000000, due_date: null, valid_until: null };
  fixtures = await rest("documents", { method: "POST", body: [
    { ...common, document_type: "quotation", document_number: `QUO-LIFE-${suffix}`, status: "sent", valid_until: past, public_token: crypto.randomBytes(16).toString("hex") },
    { ...common, document_type: "invoice", document_number: `INV-LIFE-${suffix}`, status: "sent", due_date: past, public_token: crypto.randomBytes(16).toString("hex") },
    { ...common, document_type: "receipt", document_number: `REC-LIFE-${suffix}`, status: "paid", subtotal_kobo: 125000, total_kobo: 125000, amount_paid_kobo: 125000, balance_remaining_kobo: 0, public_token: crypto.randomBytes(16).toString("hex") },
  ] });
  const quotationNumber = fixtures.find(d => d.document_type === "quotation").document_number;
  const invoiceNumber = fixtures.find(d => d.document_type === "invoice").document_number;

  await step("sign in", async () => {
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    await page.getByLabel("Email address").fill("qa.tester@rela.test");
    await page.getByLabel("Password").fill("QaTest12345");
    await page.getByRole("button", { name: /^log in$/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  });
  await step("list shows Expired and Overdue badges", async () => {
    await page.goto(`${base}/documents`, { waitUntil: "networkidle" });
    await page.locator("a", { hasText: quotationNumber }).first().getByText("Expired").waitFor();
    await page.locator("a", { hasText: invoiceNumber }).first().getByText("Overdue").waitFor();
  });
  await step("expired quotation: badge + no status actions", async () => {
    await page.locator("a", { hasText: quotationNumber }).first().click();
    await page.waitForURL(/\/documents\//, { timeout: 30000 });
    await page.getByText("Expired").first().waitFor();
    if (await page.getByRole("button", { name: /mark accepted/i }).count()) throw new Error("Expired quotation still offers Mark accepted");
  });
  await step("overdue invoice still accepts payments", async () => {
    await page.goto(`${base}/documents`, { waitUntil: "networkidle" });
    await page.locator("a", { hasText: invoiceNumber }).first().click();
    await page.waitForURL(/\/documents\//, { timeout: 30000 });
    await page.getByText("Overdue").first().waitFor();
    await page.getByRole("button", { name: /record a payment/i }).waitFor();
  });
  await step("Starter sees charts, collected money and top customers", async () => {
    await page.goto(`${base}/analytics`, { waitUntil: "networkidle" });
    const section = page.locator('[data-currency="NGN"]');
    await section.getByRole("heading", { name: /money collected/i }).waitFor();
    const label = await section.locator('svg[role="img"]').getAttribute("aria-label");
    const currentMonth = new Date().toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" });
    if (!label.includes(`${currentMonth}: ₦`) || label.includes(`${currentMonth}: ₦0`)) throw new Error("Current-month receipt is missing from chart");
    await section.getByText("Outstanding", { exact: true }).waitFor();
    await section.getByRole("heading", { name: /top customers/i }).waitFor();
    await section.getByText(/overdue invoice/i).first().waitFor();
  });
  if (consoleErrors.length) throw new Error(consoleErrors.join(" | "));
} catch (e) {
  console.error(String(e).split("\n").slice(0, 3).join("\n"));
  process.exitCode = 1;
} finally {
  for (const d of fixtures) await rest(`documents?id=eq.${d.id}&business_id=eq.${BIZ}`, { method: "DELETE" });
  await rest(`document_usage?business_id=eq.${BIZ}&period_month=eq.${month}`, { method: "DELETE" });
  if (usage.length) await rest("document_usage", { method: "POST", body: usage });
  await rest(`profiles?id=eq.${UID}`, { method: "PATCH", body: profile });
  await browser.close();
  console.log("QA fixtures removed; original profile and usage restored.");
}
