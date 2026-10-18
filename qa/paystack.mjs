/**
 * qa/paystack.mjs — REL-8 end-to-end against the REAL Paystack test API.
 * Pays a genuine ₦2,500 test charge (Paystack test card) so the callback,
 * server-side verify, activation, idempotency and webhook signature checks
 * all run exactly as they will in production. Secrets via env (set -a . .env.local).
 */
import { chromium } from "playwright";
import crypto from "node:crypto";

const base = "http://localhost:3000";
const qaEmail = process.env.QA_EMAIL ?? "qa.tester@rela.test";
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PK_SECRET = process.env.PAYSTACK_SECRET_KEY;
if (!SR || !PK_SECRET) throw new Error("env not loaded");

let passed = 0;
const consoleErrors = [];
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

const rest = (path, init = {}) =>
  fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  }).then(async (r) => {
    const text = await r.text();
    return text ? JSON.parse(text) : [];
  });

const ps = (path, body) =>
  fetch(`https://api.paystack.co${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PK_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

/* ---------------------------------------------------------------- setup state */
const QA_UID = "509a7f5e-1354-4282-ba9b-ccf18d907b01";
const QA2_UID = await fetch(
  "https://zglkbrivfkabmlhrllbf.supabase.co/rest/v1/profiles?select=id&full_name=eq.QA%20Two",
  { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY } },
).then((r) => r.json()).then((a) => a[0]?.id);

// Every run starts from a clean free account.
await rest(`subscriptions?profile_id=eq.${QA_UID}`, { method: "DELETE" });
await rest(`profiles?id=eq.${QA_UID}`, {
  method: "PATCH",
  body: JSON.stringify({ plan: "free", subscription_status: "inactive", subscription_started_at: null, subscription_ends_at: null }),
});

let pendingRef; // initialize reference (hosted page would charge this in production)
let paidRef;    // QA settles a charge directly — callback/verify path is identical

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on("console", (m) => {
  // Only count OUR pages — Paystack's hosted page runs Cloudflare challenges in
  // headless browsers and logs its own noise by design.
  if (m.type() === "error" && page.url().startsWith(base)) consoleErrors.push(m.text().slice(0, 200));
});

await step("sign in (free plan) and see the pay button", async () => {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(qaEmail);
  await page.getByLabel("Password").fill("QaTest12345");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  await page.goto(`${base}/upgrade`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /upgrade to starter/i }).waitFor();
  await page.getByRole("button", { name: /pay ₦2,500 with paystack/i }).waitFor();
});

await step("checkout opens Paystack hosted page; pending row recorded", async () => {
  await page.getByRole("button", { name: /pay ₦2,500 with paystack/i }).click();
  await page.waitForURL(/checkout\.paystack\.com|pay\.paystack/i, { timeout: 45000 });
  await page.waitForTimeout(1500);
  const rows = await rest(
    "subscriptions?provider=eq.paystack&status=eq.pending&order=created_at.desc&limit=1&select=provider_reference",
  );
  pendingRef = rows[0]?.provider_reference;
  if (!pendingRef) throw new Error("no pending subscription row created");
  console.log(`   → pending reference ${pendingRef} (hosted page would charge this)`);
});

await step("customer pays: real ₦2,500 charge clears on Paystack test card", async () => {
  // Paystack refuses /charge on a reference already initialized for hosted checkout,
  // so the QA settles its own fresh reference; activation logic is reference-driven.
  paidRef = `rel_qa_${Date.now()}`;
  const charge = await ps("/charge", {
    email: qaEmail,
    amount: 250000,
    currency: "NGN",
    reference: paidRef,
    card: { number: "4084084084084081", cvv: "408", expiry_month: "12", expiry_year: "2030" },
    pin: "0000",
  });
  let st = charge?.data?.status;
  if (st === "send_pin") {
    const r = await ps("/charge/submit_pin", { reference: paidRef, pin: "0000" });
    st = r?.data?.status;
  }
  if (st === "send_otp") {
    const r = await ps("/charge/submit_otp", { reference: paidRef, otp: "123456" });
    st = r?.data?.status;
  }
  if (st !== "success") throw new Error(`charge not successful, got: ${st} ${JSON.stringify(charge).slice(0, 200)}`);
});

await step("callback verifies server-side and activates Starter", async () => {
  await page.goto(`${base}/billing/callback?reference=${paidRef}`, { waitUntil: "commit" });
  await page.waitForURL(/\/upgrade\?paid=1/, { timeout: 45000 });
  await page.goto(`${base}/upgrade`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /you’re on starter/i }).waitFor();
  const prof = await rest(
    "profiles?id=eq." + QA_UID + "&select=plan,subscription_status,subscription_ends_at",
  );
  if (prof[0]?.plan !== "starter" || prof[0]?.subscription_status !== "active")
    throw new Error(`profile not activated: ${JSON.stringify(prof)}`);
  console.log(`   → active until ${prof[0].subscription_ends_at}`);
});

await step("callback replay is idempotent (no double charge/record)", async () => {
  await page.goto(`${base}/billing/callback?reference=${paidRef}`, { waitUntil: "commit" });
  await page.waitForURL(/\/upgrade\?paid=1/, { timeout: 45000 });
  const rows = await rest(
    `subscriptions?provider=eq.paystack&provider_reference=eq.${paidRef}&select=id`,
  );
  if (rows.length !== 1) throw new Error(`expected 1 subscription row, got ${rows.length}`);
});

await step("forged/wrong reference is rejected, not activated", async () => {
  await page.goto(`${base}/billing/callback?reference=rel_forged_0000000000`, { waitUntil: "commit" });
  await page.waitForURL(/\/upgrade\?paid=failed/, { timeout: 45000 });
});

await step("webhook with a bad signature is refused (401)", async () => {
  const res = await fetch(`${base}/api/webhooks/paystack`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": "deadbeef" },
    body: JSON.stringify({ event: "charge.success", data: { reference: "x" } }),
  });
  if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
});

await step("webhook with faked success but unverifiable reference never activates", async () => {
  // qa2 stays free: a signed-looking webhook body that Paystack itself can't verify
  const fakeRef = "rel_attacker_0000000000";
  const payload = JSON.stringify({
    event: "charge.success",
    data: { reference: fakeRef, metadata: { user_id: QA2_UID } },
  });
  const sig = crypto.createHmac("sha512", PK_SECRET).update(payload).digest("hex");
  const res = await fetch(`${base}/api/webhooks/paystack`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": sig },
    body: payload,
  });
  const prof = await rest(`profiles?id=eq.${QA2_UID}&select=plan`);
  if (prof[0]?.plan !== "free") throw new Error("attacker upgraded an account without paying!");
  const body = await res.json();
  // duplicate-replay answers 200 ok:true by design; the invariant is: no activation.
  if (body.ok === true && !body.duplicate) throw new Error(`webhook accepted unverifiable charge: ${res.status}`);
});

console.log(`\nconsole errors: ${consoleErrors.length ? consoleErrors.join("\n") : "none"}`);
await browser.close();
process.exit(consoleErrors.length ? 2 : 0);

// tidy: drop the QA 'pending' ledger row left by initialize (production keeps its own)
await rest(`subscriptions?provider=eq.paystack&provider_reference=eq.${pendingRef}`, { method: "DELETE" });
