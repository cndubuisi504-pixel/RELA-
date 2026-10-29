// Targeted security review. Uses only the two disposable Rela QA accounts.
// Restores billing, usage, numbering and fixtures in finally. Never initializes a payment.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
process.loadEnvFile('.env.local');
const E = process.env;
const BASE = E.QA_BASE_URL || 'https://rela-ng.vercel.app';
const DB = E.NEXT_PUBLIC_SUPABASE_URL;
const ANON = E.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = E.SUPABASE_SERVICE_ROLE_KEY;
const QA1 = '509a7f5e-1354-4282-ba9b-ccf18d907b01';
const started = new Date().toISOString();
const run = Date.now().toString();
const marker = `Security QA ${run}`;
const month = new Date().toISOString().slice(0, 7) + '-01';
const checks = [], findings = [], cleanupErrors = [];
const docIds = [];
let browser, state, users, seqTouched = false;
function pass(name, detail = '') { checks.push({ name, result: 'PASS', detail }); console.log('PASS', name); }
function finding(id, severity, name, evidence) {
  findings.push({ id, severity, name, evidence }); console.log('FINDING', id, severity, name, JSON.stringify(evidence));
}
async function rest(path, key, token = key, options = {}) {
  const response = await fetch(`${DB}/rest/v1/${path}`, {
    ...options, headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: response.ok, status: response.status, data };
}
const admin = (path, options) => rest(path, SERVICE, SERVICE, options);
const authed = (u, path, options) => rest(path, ANON, u.access_token, options);
const anon = (path, options) => rest(path, ANON, ANON, options);
const need = (r, label) => { if (!r.ok) throw new Error(`${label}: HTTP ${r.status} ${r.data?.code || ''}`); return r.data; };
const profileFields = ['role', 'plan', 'subscription_status', 'subscription_started_at', 'subscription_ends_at'];
const protectedFields = p => Object.fromEntries(profileFields.map(k => [k, p[k]]));
const profile = async id => need(await admin(`profiles?id=eq.${id}&select=*`), 'profile')[0];
async function loginAPI(email) {
  const r = await fetch(`${DB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'QaTest12345' }) });
  const u = await r.json();
  if (!r.ok || u.user?.email !== email) throw new Error('QA authentication failed');
  const businesses = need(await authed(u, `businesses?owner_id=eq.${u.user.id}&select=id`), 'QA businesses');
  if (businesses.length !== 1) throw new Error('Unexpected QA business count');
  return { ...u, businessId: businesses[0].id };
}
async function loginBrowser(u, next) {
  const context = await browser.newContext(); const page = await context.newPage();
  // An external redirect probe is intercepted locally; no attacker site is contacted.
  await context.route('https://example.invalid/**', route => route.fulfill({ status: 200, contentType: 'text/plain', body: 'Intercepted security redirect probe' }));
  await page.goto(`${BASE}/login${next ? '?next=' + encodeURIComponent(next) : ''}`);
  await page.getByLabel(/^Email address/).fill(u.user.email);
  await page.getByLabel(/^Password/).fill('QaTest12345');
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL(url => url.pathname !== '/login', { timeout: 20000 });
  return { context, page };
}
async function cleanup(label, f) { try { await f(); } catch (e) { cleanupErrors.push(`${label}: ${e.message}`); console.error('CLEANUP ERROR', label, e.message); } }
try {
  if (!DB || !SERVICE || !ANON) throw new Error('Missing local QA environment');
  users = await Promise.all([loginAPI('qa.tester@rela.test'), loginAPI('qa2@rela.test')]);
  if (users[0].user.id !== QA1) throw new Error('Unexpected primary QA identity');
  const [a, b] = users;
  const ids = users.map(u => u.user.id).join(',');
  state = {
    profiles: await Promise.all(users.map(u => profile(u.user.id))),
    subscriptions: need(await admin(`subscriptions?profile_id=in.(${ids})&select=*`), 'subscription snapshot'),
    usage: need(await admin(`document_usage?business_id=eq.${a.businessId}&period_month=eq.${month}&select=*`), 'usage snapshot'),
    sequences: need(await admin(`document_number_sequences?business_id=eq.${a.businessId}&select=*`), 'numbering snapshot'),
  };
  // Recovery file contains only QA state, no credentials or access tokens.
  fs.writeFileSync('/tmp/rela-security-qa-state.json', JSON.stringify(state));

  for (const table of ['profiles','businesses','document_number_sequences','documents','document_items','document_usage','subscriptions','subscription_events','audit_logs','document_conversions','notifications']) {
    const r = await anon(`${table}?select=*&limit=1`);
    if ((r.ok && Array.isArray(r.data) && r.data.length === 0) || [401, 403].includes(r.status)) pass(`Anonymous cannot read ${table}`);
    else finding(`ANON-${table}`, 'high', 'Anonymous table access not denied', { table, status: r.status });
  }
  const settings = await anon('site_settings?select=*&limit=1');
  if (settings.ok) pass('Intentional public site settings remain readable');
  const crossBusiness = await authed(b, `businesses?id=eq.${a.businessId}&select=*`);
  if (crossBusiness.ok && crossBusiness.data.length === 0) pass('Cross-tenant business read blocked');
  else finding('TENANT-BUSINESS', 'high', 'Cross-tenant business read', { status: crossBusiness.status });

  await admin(`profiles?id=eq.${a.user.id}`, { method: 'PATCH', body: { plan: 'free', subscription_status: 'inactive', subscription_ends_at: null } }).then(r => need(r, 'QA free plan'));
  const tamper = await authed(a, `profiles?id=eq.${a.user.id}`, { method: 'PATCH', body: { role: 'admin', plan: 'starter', subscription_status: 'active', subscription_ends_at: '2099-01-01T00:00:00Z' } });
  const afterTamper = await profile(a.user.id);
  if (!tamper.ok && afterTamper.role === state.profiles[0].role && afterTamper.plan === 'free') pass('Authenticated self role/plan escalation rejected');
  else finding('PROFILE-TAMPERING', 'critical', 'Self role/plan escalation', { status: tamper.status });
  await admin(`profiles?id=eq.${a.user.id}`, { method: 'PATCH', body: { ...protectedFields(state.profiles[0]), plan: 'starter', subscription_status: 'active', subscription_ends_at: '2099-01-01T00:00:00Z' } }).then(r => need(r, 'QA fixture eligibility'));

  seqTouched = true;
  const seed = await authed(a, 'rpc/create_document_in_currency', { method: 'POST', body: {
    p_type: 'quotation', p_customer_name: marker, p_items: [{ description: '<script>alert(1)</script>', quantity: 1, unit_price_kobo: 10000 }],
    p_currency: 'USD', p_payment_instructions: 'QA only',
  } });
  const seedId = need(seed, 'fixture create').id; docIds.push(seedId);
  const fixture = need(await admin(`documents?id=eq.${seedId}&select=*`), 'fixture')[0];
  const cross = await authed(b, `documents?id=eq.${seedId}&select=*`);
  if (cross.ok && cross.data.length === 0) pass('Cross-tenant document read blocked'); else finding('TENANT-READ', 'high', 'Cross-tenant document read', { status: cross.status });
  const patch = await authed(b, `documents?id=eq.${seedId}`, { method: 'PATCH', body: { customer_name: 'Not allowed' } });
  const unchanged = need(await admin(`documents?id=eq.${seedId}&select=customer_name`), 'tenant readback')[0];
  if (unchanged.customer_name === marker && (!patch.ok || patch.data.length === 0)) pass('Cross-tenant document write blocked'); else finding('TENANT-WRITE', 'high', 'Cross-tenant document write', { status: patch.status });
  const convert = await authed(b, 'rpc/convert_document', { method: 'POST', body: { p_source_id: seedId, p_target: 'invoice' } });
  if (!convert.ok) pass('Cross-tenant conversion RPC rejected'); else { docIds.unshift(convert.data.id); finding('TENANT-CONVERT', 'high', 'Cross-tenant conversion RPC', { status: convert.status }); }

  const seqAnon = await anon('rpc/next_document_number', { method: 'POST', body: { p_business_id: a.businessId, p_type: 'invoice', p_date: '2099-01-01' } });
  if (seqAnon.ok) finding('SEC-03', 'medium', 'Anonymous caller can mutate a business document-number sequence', { status: seqAnon.status, date: '2099-01-01', business: 'QA1 only' }); else pass('Anonymous document numbering denied');
  const seqOther = await authed(b, 'rpc/next_document_number', { method: 'POST', body: { p_business_id: a.businessId, p_type: 'invoice', p_date: '2099-01-01' } });
  if (seqOther.ok) finding('SEC-03B', 'medium', 'Another tenant can mutate QA1 document numbering', { status: seqOther.status }); else pass('Cross-tenant document numbering denied');

  await admin(`profiles?id=eq.${a.user.id}`, { method: 'PATCH', body: { plan: 'free', subscription_status: 'inactive', subscription_ends_at: null } }).then(r => need(r, 'quota eligibility'));
  await admin('document_usage?on_conflict=business_id,period_month', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: { business_id: a.businessId, period_month: month, document_count: 5 } }).then(r => need(r, 'quota fixture'));
  const bypass = await authed(a, 'documents', { method: 'POST', body: {
    business_id: a.businessId, created_by: a.user.id, document_type: 'invoice', document_number: `INV-SECURITY-${run}`,
    status: 'draft', customer_name: marker, daily_sequence: 1, subtotal_kobo: 10000, total_kobo: 10000, amount_paid_kobo: 0, balance_remaining_kobo: 10000,
    source_document_id: seedId, currency: 'USD',
  } });
  if (bypass.ok && bypass.data[0]?.id) {
    docIds.unshift(bypass.data[0].id);
    finding('SEC-04', 'medium', 'Free quota bypass through direct REST insert with forged source', { status: bypass.status, existingQuota: 5, newDocumentCreated: true });
  } else pass('Direct REST source/quota bypass rejected');
  const partial = await authed(a, 'documents', { method: 'POST', body: {
    business_id: a.businessId, created_by: a.user.id, document_type: 'receipt', document_number: `REC-SECURITY-${run}`,
    status: 'balance_owed', customer_name: marker, daily_sequence: 1, subtotal_kobo: 10000, total_kobo: 10000, amount_paid_kobo: 1, balance_remaining_kobo: 9999,
    source_document_id: seedId, currency: 'USD',
  } });
  if (partial.ok && partial.data[0]?.id) {
    docIds.unshift(partial.data[0].id);
    finding('SEC-04B', 'medium', 'Forged source bypasses full-payment direct-receipt rule', { status: partial.status, sourceType: 'quotation', receiptPaid: 1, total: 10000 });
  } else pass('Forged-source partial receipt rejected');

  // Expired entitlement check without downgrading or modifying any real customer.
  await admin(`profiles?id=eq.${a.user.id}`, { method: 'PATCH', body: { plan: 'starter', subscription_status: 'active', subscription_ends_at: '2001-01-01T00:00:00Z' } }).then(r => need(r, 'expired QA fixture'));
  const expired = await authed(a, 'rpc/create_document_in_currency', { method: 'POST', body: {
    p_type: 'quotation', p_customer_name: marker, p_items: [{ description: 'Expired entitlement probe', quantity: 1, unit_price_kobo: 1000 }], p_currency: 'NGN',
  } });
  if (expired.ok) { docIds.unshift(expired.data.id); finding('SEC-05', 'medium', 'Expired active Starter entitlement bypasses free quota', { status: expired.status, expiredAt: '2001-01-01T00:00:00Z', quotaBefore: 5 }); }
  else pass('Expired Starter does not bypass free quota');

  for (const path of ['/.env', '/.env.local', '/.git/HEAD', '/.git/config']) {
    const r = await fetch(BASE + path, { redirect: 'manual' });
    if ([400,401,403,404].includes(r.status)) pass(`Private path not served: ${path}`);
    else finding('FILES-' + path, 'high', 'Sensitive path response needs review', { path, status: r.status });
  }
  const invalidSignature = await fetch(BASE + '/api/webhooks/paystack', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-paystack-signature': '0'.repeat(128) }, body: '{}' });
  if (invalidSignature.status === 401) pass('Invalid Paystack webhook signature rejected'); else finding('WEBHOOK-AUTH', 'high', 'Unexpected invalid webhook response', { status: invalidSignature.status });
  const unicodeSignature = await fetch(BASE + '/api/webhooks/paystack', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'é'.repeat(128) }, body: '{}' });
  if (unicodeSignature.status >= 500) finding('SEC-07', 'low', 'Malformed non-ASCII signature causes server error', { status: unicodeSignature.status }); else pass('Malformed non-ASCII webhook signature safely rejected', `HTTP ${unicodeSignature.status}`);

  const tracked = execFileSync('git', ['ls-files', '-z']).toString().split('\0').filter(Boolean);
  const leaked = [];
  const privateValues = [SERVICE, E.PAYSTACK_SECRET_KEY].filter(v => v && v.length > 20);
  for (const path of tracked) {
    if (!fs.existsSync(path)) continue;
    const body = fs.readFileSync(path);
    if (privateValues.some(v => body.includes(Buffer.from(v)))) leaked.push(path);
  }
  if (leaked.length === 0) pass('Tracked source does not contain the configured private API key values'); else finding('KEYS', 'critical', 'Configured private key embedded in tracked file', { paths: leaked });

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ba = await loginBrowser(a, '/\\example.invalid/probe');
  if (new URL(ba.page.url()).origin !== new URL(BASE).origin) finding('SEC-06', 'medium', 'Login next parameter permits an external redirect', { target: 'https://example.invalid/probe', network: 'intercepted locally; no external contact' }); else pass('Backslash login redirect stays on Rela');
  const anonContext = await browser.newContext(); const anonPage = await anonContext.newPage();
  await anonPage.goto(BASE + '/admin');
  if (new URL(anonPage.url()).pathname === '/login') pass('Anonymous admin page access redirects to login'); else finding('ADMIN-ANON', 'high', 'Anonymous admin route requires review', { path: new URL(anonPage.url()).pathname });
  await anonContext.close();
  const adminResponse = await ba.page.goto(BASE + '/admin');
  if (adminResponse.status() === 404) pass('Regular QA account cannot access admin page'); else finding('ADMIN-USER', 'high', 'Non-admin admin route requires review', { status: adminResponse.status() });
  const baHTML = await ba.page.goto(BASE + '/dashboard').then(r => r.text());
  const sources = [...new Set([...baHTML.matchAll(/src="([^\"]+\.js(?:\?[^\"]*)?)"/g)].map(m => m[1]))];
  let bundleLeak = false;
  for (const src of sources) {
    const text = await fetch(new URL(src, BASE)).then(r => r.text());
    if (privateValues.some(v => text.includes(v))) bundleLeak = true;
  }
  if (!bundleLeak) pass('Checked dashboard JavaScript chunks do not contain configured private keys', `${sources.length} chunks`); else finding('BUNDLE-KEY', 'critical', 'Configured private key in client bundle', {});

  // Billing replay/ownership test is allowed ONLY for an already-completed Paystack test transaction.
  const reference = state.subscriptions.find(s => s.profile_id === a.user.id && s.provider === 'paystack' && s.status === 'active')?.provider_reference;
  if (reference && E.PAYSTACK_SECRET_KEY?.startsWith('sk_test_')) {
    const v = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), { headers: { Authorization: `Bearer ${E.PAYSTACK_SECRET_KEY}` } }).then(r => r.json());
    if (v.status && v.data?.status === 'success' && v.data.domain === 'test' && v.data.customer?.email === a.user.email) {
      await admin(`profiles?id=eq.${a.user.id}`, { method: 'PATCH', body: { plan: 'free', subscription_status: 'inactive', subscription_ends_at: null } }).then(r => need(r, 'replay start'));
      await ba.page.goto(`${BASE}/billing/callback?reference=${encodeURIComponent(reference)}`);
      const first = await profile(a.user.id);
      await ba.page.goto(`${BASE}/billing/callback?reference=${encodeURIComponent(reference)}`);
      const second = await profile(a.user.id);
      if (first.subscription_ends_at && second.subscription_ends_at > first.subscription_ends_at) finding('SEC-02', 'high', 'Replaying the same successful payment extends access again', { firstExpiry: first.subscription_ends_at, replayExpiry: second.subscription_ends_at, domain: 'test', newCharge: false }); else pass('Billing replay does not extend subscription expiry');
      const bb = await loginBrowser(b);
      const beforeB = await profile(b.user.id);
      await bb.page.goto(`${BASE}/billing/callback?reference=${encodeURIComponent(reference)}`);
      const afterB = await profile(b.user.id);
      const record = need(await admin(`subscriptions?provider_reference=eq.${encodeURIComponent(reference)}&select=profile_id`), 'billing ownership check')[0];
      if ((afterB.subscription_ends_at !== beforeB.subscription_ends_at && afterB.plan === 'starter') || record?.profile_id === b.user.id) finding('SEC-01', 'high', 'Another QA account can activate using QA1 completed payment reference', { owner: 'QA1', caller: 'QA2', domain: 'test', newCharge: false }); else pass('Different-account payment reference is rejected');
      await bb.context.close();
    } else pass('Billing dynamic tests skipped: existing QA payment is not a verified successful test transaction');
  } else pass('Billing dynamic tests skipped: no existing successful QA test transaction/test key');
  await ba.context.close();
} catch (e) {
  console.error('AUDIT ERROR', e.message);
  checks.push({ name: 'Audit execution', result: 'ERROR', detail: e.message });
} finally {
  if (state && users) {
    const [a, b] = users;
    for (const id of [...new Set(docIds)]) {
      await cleanup('delete QA fixture', async () => need(await admin(`documents?id=eq.${id}&business_id=eq.${a.businessId}`, { method: 'DELETE' }), 'delete fixture'));
      await cleanup('delete QA fixture audit', async () => need(await admin(`audit_logs?business_id=eq.${a.businessId}&entity_id=eq.${id}&created_at=gte.${encodeURIComponent(started)}`, { method: 'DELETE' }), 'delete fixture audit'));
    }
    await cleanup('restore QA usage', async () => {
      need(await admin(`document_usage?business_id=eq.${a.businessId}&period_month=eq.${month}`, { method: 'DELETE' }), 'reset usage');
      if (state.usage.length) need(await admin('document_usage', { method: 'POST', body: state.usage }), 'restore usage');
    });
    if (seqTouched) await cleanup('restore QA numbering', async () => {
      need(await admin(`document_number_sequences?business_id=eq.${a.businessId}`, { method: 'DELETE' }), 'reset QA numbering');
      if (state.sequences.length) need(await admin('document_number_sequences', { method: 'POST', body: state.sequences }), 'restore QA numbering');
    });
    await cleanup('restore QA subscriptions', async () => {
      const ids = users.map(u => u.user.id).join(',');
      const after = need(await admin(`subscriptions?profile_id=in.(${ids})&select=id`), 'after subscriptions');
      const beforeIds = new Set(state.subscriptions.map(s => s.id));
      for (const s of after) if (!beforeIds.has(s.id)) need(await admin(`subscriptions?id=eq.${s.id}`, { method: 'DELETE' }), 'delete new QA subscription');
      if (state.subscriptions.length) need(await admin('subscriptions?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: state.subscriptions }), 'restore subscriptions');
    });
    for (const p of state.profiles) await cleanup('restore QA profile', async () => need(await admin(`profiles?id=eq.${p.id}`, { method: 'PATCH', body: protectedFields(p) }), 'restore profile'));
    for (const u of users) await cleanup('remove QA billing audit events', async () => need(await admin(`audit_logs?business_id=eq.${u.businessId}&action=eq.billing.activated&created_at=gte.${encodeURIComponent(started)}`, { method: 'DELETE' }), 'QA audit cleanup'));
    if (cleanupErrors.length === 0) pass('QA billing, usage, numbering and disposable documents restored');
  }
  if (browser) await browser.close();
  const report = { date: new Date().toISOString(), base: BASE, checks, findings, cleanupErrors };
  fs.writeFileSync('/tmp/rela-security-audit.json', JSON.stringify(report, null, 2));
  console.log(`\n${checks.filter(c => c.result === 'PASS').length} passed checks; ${findings.length} findings; ${cleanupErrors.length} cleanup errors.`);
  process.exitCode = cleanupErrors.length || checks.some(c => c.result === 'ERROR') ? 1 : findings.length ? 2 : 0;
}
