/** Multi-currency UI/RPC regression checks, isolated to the dedicated QA account.
 * Restores business defaults, profile and usage even on a failed assertion.
 * QA_BASE_URL can point to production for the post-deploy smoke test.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import crypto from "node:crypto";

const base = process.env.QA_BASE_URL || "http://localhost:3000";
const BIZ = "224a87f0-5294-4ae1-bd81-86da8ed685ba";
const SUPA = "https://zglkbrivfkabmlhrllbf.supabase.co";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY to run this QA-account-only suite.");
const envExample = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envExample.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m)?.[1].replace(/^['"]|['"]$/g, "");
const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function rest(path, { body, ...init } = {}) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { ...init, headers: h, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!r.ok) throw new Error(`QA fixture ${r.status}: ${(await r.text()).slice(0, 180)}`);
  return r.status === 204 ? null : r.json();
}
async function userToken(email = "qa.tester@rela.test") {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: anon, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "QaTest12345" }) });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error("QA token login failed");
  return d.access_token;
}
async function rpc(name, body, token) {
  return fetch(`${SUPA}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
let checks = 0;
function check(name, ok) {
  checks++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) throw new Error(name);
}
const [business] = await rest(`businesses?id=eq.${BIZ}&select=owner_id,default_currency,payment_instructions,default_mode,bank_name,bank_account_name,bank_account_number`);
const { owner_id: UID, ...businessRestore } = business;
const [profile] = await rest(`profiles?id=eq.${UID}&select=plan,subscription_status`);
const month = new Date().toISOString().slice(0, 7) + "-01";
const usage = await rest(`document_usage?business_id=eq.${BIZ}&period_month=eq.${month}`);
const run = crypto.randomBytes(5).toString("hex");
const customerName = `Currency QA ${run}`;
const instructions = `USD transfer / account from your own provider\nPayment reference: ${run}\n<script>alert('currency-probe')</script>`;
const ids = new Set();
const consoleErrors = [];
const dialogs = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on("dialog", async d => { dialogs.push(d.message()); await d.dismiss(); });
page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 140)); });
const totals = async () => rest(`documents?business_id=eq.${BIZ}&select=id,document_type,currency,status,total_kobo,amount_paid_kobo,receipt_for_payment_kobo,balance_remaining_kobo`);
const collected = (rows, currency) => rows.filter(d => d.currency === currency && d.document_type === "receipt" && d.status !== "void").reduce((s, d) => s + (d.receipt_for_payment_kobo ?? d.amount_paid_kobo), 0);
const outstanding = (rows, currency) => rows.filter(d => d.currency === currency && d.document_type === "invoice" && d.status !== "void").reduce((s, d) => s + d.balance_remaining_kobo, 0);
const money = (minor, currency) => new Intl.NumberFormat({ USD: "en-US", GBP: "en-GB", EUR: "en-IE", NGN: "en-NG" }[currency], { style: "currency", currency, minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
const baseline = await totals();

async function newDocument(type, currency, amount) {
  await page.goto(`${base}/documents/new?type=${type}`, { waitUntil: "networkidle" });
  if (currency) await page.getByRole("radio", { name: new RegExp(currency) }).check();
  await page.getByRole("button", { name: /^product$/i }).click();
  await page.getByLabel(/^Name/i).first().fill(customerName);
  await page.getByLabel("Item name").first().fill("Design / consulting package");
  await page.getByLabel("Unit price for row 1").fill(String(amount));
}
async function save(type) {
  await page.getByRole("button", { name: new RegExp(`^save ${type}$`, "i") }).click();
  await page.waitForURL(/\/documents\/[0-9a-f-]{36}\?created=1/, { timeout: 60000 });
  const id = new URL(page.url()).pathname.split("/").at(-1);
  ids.add(id);
  await page.getByRole("heading", { name: new RegExp(type, "i") }).first().waitFor();
  return id;
}
async function pay(id, amount) {
  await page.goto(`${base}/documents/${id}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /record a payment/i }).click();
  const sheet = page.getByRole("dialog", { name: /record a payment/i });
  await sheet.getByLabel(/amount received/i).fill(String(amount));
  await sheet.getByRole("button", { name: /create receipt/i }).click();
  await page.waitForURL(/\?payment=1/, { timeout: 60000 });
  const receiptId = new URL(page.url()).pathname.split("/").at(-1);
  ids.add(receiptId);
  return receiptId;
}

try {
  await rest(`profiles?id=eq.${UID}`, { method: "PATCH", body: { plan: "starter", subscription_status: "active" } });
  await rest(`businesses?id=eq.${BIZ}`, { method: "PATCH", body: { default_currency: "NGN", payment_instructions: null, bank_name: "QA Nigerian Bank", bank_account_number: "0123456789", bank_account_name: "QA Business" } });
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill("qa.tester@rela.test");
  await page.getByLabel("Password").fill("QaTest12345");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });

  await page.goto(`${base}/settings`, { waitUntil: "networkidle" });
  await page.getByLabel(/default currency/i).selectOption("USD");
  await page.getByLabel(/payment instructions/i).fill(instructions);
  await page.getByRole("button", { name: /^save changes$/i }).click();
  await page.getByText("Saved — new documents will use these details.", { exact: true }).waitFor();
  const [savedBusiness] = await rest(`businesses?id=eq.${BIZ}&select=default_currency,payment_instructions`);
  check("settings persists USD and the exact instructions", savedBusiness.default_currency === "USD" && savedBusiness.payment_instructions === instructions);

  await newDocument("invoice", null, "1200.50");
  check("editor inherits USD from Settings", await page.getByRole("radio", { name: /USD/ }).isChecked());
  check("editor inherits the payment instructions", await page.getByLabel("Payment instructions", { exact: true }).inputValue() === instructions);
  const totalsSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Totals", exact: true }) });
  for (const [currency, symbol] of [["NGN", "₦"], ["USD", "$"], ["GBP", "£"], ["EUR", "€"]]) {
    await page.getByRole("radio", { name: new RegExp(currency) }).check();
    const label = await page.locator('label').filter({ hasText: /^Unit price/ }).innerText();
    const t = await totalsSection.innerText();
    check(`${currency} updates row labels, input prefixes and totals`, label.includes(symbol) && t.includes(symbol) && (currency === "NGN" || !t.includes("₦")));
  }
  await page.getByRole("radio", { name: /USD/ }).check();
  await page.getByLabel("Discount", { exact: true }).fill("10");
  await page.getByLabel("VAT / tax", { exact: true }).fill("20");
  await page.getByLabel("Delivery fee", { exact: true }).fill("50");
  const invId = await save("invoice");
  const [inv] = await rest(`documents?id=eq.${invId}&select=currency,payment_instructions,total_kobo,public_token`);
  check("invoice saves exact USD totals and instructions atomically", inv.currency === "USD" && inv.total_kobo === 126050 && inv.payment_instructions === instructions);
  const detail = await page.locator("article").first().innerText();
  check("USD invoice detail is $1,260.50 with no naira amounts", detail.includes("$1,260.50") && !detail.includes("₦"));
  check("foreign invoice does not show the NGN bank account", !detail.includes("0123456789"));
  check("instruction text cannot execute stored scripts", detail.includes("<script>alert('currency-probe')</script>") && dialogs.length === 0);
  const captured = await page.locator("#pdf-capture-root").textContent();
  check("Save-PDF capture uses USD and the stored instructions", captured.includes("$1,260.50") && captured.includes(instructions.split("\n")[0]));

  await page.getByRole("button", { name: /share invoice/i }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 90000 }),
    page.getByRole("dialog").getByText("Save PDF", { exact: true }).click(),
  ]);
  await download.saveAs("/tmp/rela-currency-invoice.pdf");
  check("foreign-currency invoice downloads as a real PDF", fs.statSync("/tmp/rela-currency-invoice.pdf").size > 25000 && download.suggestedFilename().endsWith(".pdf"));
  await page.getByRole("dialog").getByRole("button", { name: /close/i }).click();

  await page.goto(`${base}/documents/${invId}/print?noprint=1`, { waitUntil: "networkidle" });
  const printText = (await page.locator(".print-sheet").innerText()).replace(/\s+/g, " ");
  check("print includes USD, delivery and How to pay", printText.includes("$1,260.50") && /Delivery\s*\+\s*\$50/.test(printText) && /how to pay/i.test(printText));
  check("print does not suggest an NGN bank for USD payment", !printText.includes("0123456789"));
  await page.screenshot({ path: "/tmp/rela-currency-print.png", fullPage: true });

  await page.goto(`${base}/r/${inv.public_token}`, { waitUntil: "networkidle" });
  const publicText = await page.locator("body").innerText();
  check("public page shows correct USD and delivery amounts", publicText.includes("$1,260.50") && /Delivery\s*\$50/.test(publicText));
  check("public page shows inert payment instructions", publicText.includes("<script>alert('currency-probe')</script>") && dialogs.length === 0);
  const html = await page.content();
  check("public instruction markup is escaped", !html.includes("<script>alert('currency-probe')</script>"));

  await page.goto(`${base}/documents/${invId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /record a payment/i }).click();
  let sheet = page.getByRole("dialog", { name: /record a payment/i });
  check("payment sheet uses USD for its balance and amount label", (await sheet.innerText()).includes("$1,260.50") && await sheet.getByLabel("Amount received ($)", { exact: true }).count() === 1);
  await sheet.getByRole("button", { name: /close/i }).last().click();
  const recId = await pay(invId, "200");
  let rec = (await rest(`documents?id=eq.${recId}&select=currency,receipt_for_payment_kobo,payment_instructions`))[0];
  check("payment receipt inherits USD inside the database transaction", rec.currency === "USD" && rec.receipt_for_payment_kobo === 20000);
  check("receipt does not ask the customer to pay again", rec.payment_instructions === null);
  check("receipt detail shows this payment as $200", /This payment\s*\$200/.test(await page.locator("article").first().innerText()));
  await pay(invId, "300");
  await page.goto(`${base}/documents/${invId}`, { waitUntil: "networkidle" });
  check("two payments leave the correct $760.50 balance", /Balance\s*\$760\.50/.test(await page.locator("article").first().innerText()));

  for (const [currency, symbol] of [["NGN", "₦"], ["GBP", "£"], ["EUR", "€"]]) {
    await newDocument("receipt", currency, currency === "NGN" ? "5000" : "10.25");
    const id = await save("receipt");
    const t = await page.locator("article").first().innerText();
    check(`${currency} receipt persists and displays its own currency`, t.includes(currency === "NGN" ? "₦5,000" : `${symbol}10.25`) && (await rest(`documents?id=eq.${id}&select=currency`))[0].currency === currency);
  }

  await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
  const summary = await page.getByRole("region", { name: "Summary", exact: true }).innerText();
  check("dashboard stacks the outstanding USD amount separately", summary.includes(money(outstanding(baseline, "USD") + 76050, "USD")));
  check("dashboard counts $200 + $300 as $500, not $700", summary.includes(money(collected(baseline, "USD") + 50000, "USD")));
  check("dashboard keeps GBP, EUR and NGN collected totals separate", summary.includes(money(collected(baseline, "NGN") + 500000, "NGN")) && summary.includes(money(collected(baseline, "GBP") + 1025, "GBP")) && summary.includes(money(collected(baseline, "EUR") + 1025, "EUR")));

  await page.goto(`${base}/analytics`, { waitUntil: "networkidle" });
  const usdSection = page.locator('[data-currency="USD"]');
  const stats = await usdSection.getByRole("region", { name: "Key numbers (USD)", exact: true }).innerText();
  check("analytics also separates USD outstanding and collected", stats.includes(money(collected(baseline, "USD") + 50000, "USD")) && stats.includes(money(outstanding(baseline, "USD") + 76050, "USD")) && !stats.includes("₦"));
  const chart = usdSection.locator('svg[role="img"]');
  check("chart visible value labels use dollars, not naira", (await chart.textContent()).includes("$") && !(await chart.textContent()).includes("₦"));
  const top = usdSection.getByRole("region", { name: "Top customers (USD)", exact: true });
  const clientRow = top.locator("li", { hasText: customerName });
  check("top customers count receipts only, without invoice double-counting", (await clientRow.innerText()).includes("$500"));
  check("GBP and EUR have their own analytics sections", await page.locator('[data-currency="GBP"]').count() === 1 && await page.locator('[data-currency="EUR"]').count() === 1);

  await newDocument("quotation", "USD", "800");
  const quoId = await save("quotation");
  await rest(`businesses?id=eq.${BIZ}`, { method: "PATCH", body: { default_currency: "EUR", payment_instructions: "New defaults (EUR)" } });
  await page.goto(`${base}/documents/${quoId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /convert to invoice/i }).click();
  await page.waitForURL(/\?converted=1/, { timeout: 60000 });
  const convId = new URL(page.url()).pathname.split("/").at(-1);
  ids.add(convId);
  const conv = (await rest(`documents?id=eq.${convId}&select=currency,payment_instructions`))[0];
  check("conversion keeps the quotation currency, not the new business default", conv.currency === "USD");
  check("conversion snapshots the quotation payment instructions", conv.payment_instructions === instructions);
  await page.goto(`${base}/documents/${invId}`, { waitUntil: "networkidle" });
  check("changing Settings does not rewrite old document instructions", (await page.locator("article").first().innerText()).includes(instructions.split("\n")[0]));

  const token = await userToken();
  const payload = { p_type: "invoice", p_customer_name: customerName, p_items: [{ name: "RPC test", quantity: "1", unit_price_kobo: 10000 }], p_currency: "CAD" };
  const countBefore = (await totals()).length;
  let r = await rpc("create_document_in_currency", payload, token);
  check("unsupported RPC currency is rejected, not silently changed to NGN", !r.ok && (await r.text()).includes("unsupported_currency"));
  r = await rpc("create_document_in_currency", { ...payload, p_type: "receipt", p_currency: "USD", p_amount_paid_kobo: 100 }, token);
  check("RPC rejects partial direct receipts in foreign currencies", !r.ok && (await r.text()).includes("receipt_requires_full_payment"));
  check("failed RPCs leave no half-created document", (await totals()).length === countBefore);
  r = await rpc("create_document_in_currency", { ...payload, p_currency: "USD" }, anon);
  check("anonymous users cannot call the new create RPC", !r.ok);
  const tenant2 = await userToken("qa2@rela.test");
  r = await rpc("convert_document", { p_source_id: invId, p_target: "receipt", p_amount_paid_kobo: 100, p_payment_method: "Bank transfer" }, tenant2);
  check("another tenant cannot record a foreign invoice payment", !r.ok && (await r.text()).includes("document_not_found"));
  r = await fetch(`${SUPA}/rest/v1/documents?id=eq.${invId}`, { method: "PATCH", headers: h, body: JSON.stringify({ currency: "CAD" }) });
  check("database currency constraint blocks unsupported direct writes", !r.ok && (await r.text()).includes("documents_currency_allowed"));
  check("no script execution or browser errors", dialogs.length === 0 && consoleErrors.length === 0);
  console.log(`\nAll ${checks} currency checks passed.`);
} catch (e) {
  process.exitCode = 1;
  console.error(String(e).split("\n").slice(0, 6).join("\n"));
} finally {
  // Find by the random customer marker as well, so a failed navigation cannot leak a fixture.
  try {
    const rows = await rest(`documents?business_id=eq.${BIZ}&customer_name=eq.${encodeURIComponent(customerName)}&select=id,document_type`);
    // Delete receipts before their invoice; SET NULL would otherwise turn a
    // partial-payment receipt into a forbidden directly-created receipt.
    const order = { receipt: 0, invoice: 1, quotation: 2 };
    rows.sort((a, b) => order[a.document_type] - order[b.document_type]);
    for (const row of rows) await rest(`documents?id=eq.${row.id}&business_id=eq.${BIZ}`, { method: "DELETE" });
    await rest(`document_usage?business_id=eq.${BIZ}&period_month=eq.${month}`, { method: "DELETE" });
    if (usage.length) await rest("document_usage", { method: "POST", body: usage });
  } catch (e) {
    console.error("Fixture cleanup:", String(e));
    process.exitCode = 1;
  } finally {
    await rest(`businesses?id=eq.${BIZ}`, { method: "PATCH", body: businessRestore });
    await rest(`profiles?id=eq.${UID}`, { method: "PATCH", body: profile });
    await browser.close();
  }
  console.log("Currency fixtures removed; original business defaults, plan and usage restored.");
}
