/**
 * qa/share.mjs — the Share sheet end to end:
 *   collected math honesty, sheet UX, real PDF build, sheet items,
 *   fallback path (no native file-share in headless → download + wa.me).
 */
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = "http://localhost:3000";
const QA_BIZ = "224a87f0-5294-4ae1-bd81-86da8ed685ba";
const SUPA = "https://zglkbrivfkabmlhrllbf.supabase.co";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rest = (p2, init = {}) =>
  fetch(`${SUPA}/rest/v1/${p2}`, {
    ...init,
    headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, Prefer: "return=minimal", ...init.headers },
  });
let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failed++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" && page.url().startsWith(base)) consoleErrors.push(m.text().slice(0, 160));
});

/* ------------------------------------------------ sign in, create 150k receipt (mirrors Vine's case) */
await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.getByLabel("Email address").fill("qa.tester@rela.test");
await page.getByLabel("Password").fill("QaTest12345");
await page.getByRole("button", { name: /^log in$/i }).click();
await page.waitForURL(/\/dashboard/, { timeout: 45000 });

/* self-heal: run clean even after a crashed previous attempt */
await rest(`documents?business_id=eq.${QA_BIZ}`, { method: "DELETE" });
await rest(`document_usage?business_id=eq.${QA_BIZ}&period_month=eq.${new Date().toISOString().slice(0, 7) + "-01"}`, { method: "DELETE" });

await page.goto(`${base}/documents/new?type=receipt`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^product$/i }).click();
await page.getByLabel(/^Name/i).first().fill("Earlier Client");
await page.getByLabel("Item name").first().fill("Full website design + setup");
await page.getByLabel("Unit price for row 1").fill("150000");
await page.getByRole("button", { name: /^save receipt$/i }).click();
await page.waitForURL(/\/documents\/[0-9a-f-]{36}/, { timeout: 60000 });
const docUrl = page.url().split("?")[0];
check("create a ₦150k receipt with ₦0 paid (Vine's exact scenario)", Boolean(docUrl));
if (!docUrl.includes("/documents/")) throw new Error("no doc url: " + page.url());

/* ------------------------------------------------ dashboard math */
await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
const dashText = await page.locator("body").innerText();
const collectedLine = dashText.match(/collected[\s\S]*?₦([\d,.]+)/i);
const outstandingLine = dashText.match(/outstanding[\s\S]*?₦([\d,.]+)/i);
check("Collected counts money RECEIVED (₦0, not ₦150k total)",
  collectedLine && collectedLine[1].startsWith("0"), collectedLine?.[1]);
console.log(`   → Outstanding card: ₦${outstandingLine?.[1]} (invoices only by design)`);

/* ------------------------------------------------ share sheet */
await page.goto(docUrl, { waitUntil: "networkidle" });

/* clarity on a ₦0-paid receipt (the user's confusion point) */
const summaryText = await page.locator("main, [role=main], body").first().innerText();
check("₦0-paid receipt shows 'No payment received yet.'",
  /No payment received yet\./.test(summaryText), summaryText.match(/payment received yet\./i)?.[0] ?? "");
check("₦0-paid receipt does NOT claim 'Paid via …'",
  !/Paid via/i.test(summaryText));
check("Balance line reads ₦150,000", /Balance[\s\S]{0,20}150,000/.test(summaryText.replace(/₦\s?/g, "₦")));

/* hidden capture host exists with a full print sheet inside */
const hostInfo = await page.locator("#pdf-capture-root").evaluate((el) => ({
  display: getComputedStyle(el).display,
  sheets: el.querySelectorAll(".print-sheet").length,
  number: el.textContent?.includes("REC-"),
}));
check("#pdf-capture-root is pre-rendered, hidden, and holds the print sheet",
  hostInfo.display === "none" && hostInfo.sheets === 1 && !!hostInfo.number, hostInfo.display);

await page.getByRole("button", { name: /share receipt/i }).click();
const sheet = page.getByRole("dialog", { name: /share receipt/i });
check("one Share button opens the sheet", await sheet.isVisible());
for (const item of ["Share PDF on WhatsApp", "Copy public link", "Open public page", "Save as PDF"]) {
  check(`sheet has “${item}”`, (await sheet.getByText(item, { exact: false }).count()) > 0);
}
check("the old 'Open public verification page' toolbar button is gone from the page",
  (await page.getByText("Open public verification page").count()) === 0);

/* copy link */
await sheet.getByText("Copy public link").click();
await page.waitForTimeout(600);
const clipboard = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
check("copy puts the public /r/ link on the clipboard", /\/r\/[0-9a-f]{32}$/.test(clipboard), clipboard.slice(-40));

/* PDF share (headless has no native file-share → fallback: download + wa.me) */
const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 90000 }),
  sheet.getByText("Share PDF on WhatsApp").click(),
]);
const [popup] = await Promise.all([
  page.context().waitForEvent("page", { timeout: 15000, predicate: (p) => p.url().includes("wa.me") || p.url().includes("api.whatsapp.com") }).catch(() => null),
  sheet.getByText("Open WhatsApp with the link texted").click(),
]);
const fpath = path.join(os.tmpdir(), "qa-shared-receipt.pdf");
await download.saveAs(fpath);
const hostAfter = await page.locator("#pdf-capture-root").evaluate((el) => ({
  display: getComputedStyle(el).display,
  veils: document.querySelectorAll(".pdf-capture-veil").length,
}));
check("capture host hides again + veil removed after the build",
  hostAfter.display === "none" && hostAfter.veils === 0, hostAfter.display);
const size = fs.statSync(fpath).size;
check("a real PDF is produced", size > 25_000, `${Math.round(size / 1024)} KB`);
check("PDF filename is the document number", /REC-.*\.pdf$/.test(download.suggestedFilename()), download.suggestedFilename());
check("WhatsApp opens with the caption texted (fallback button)", popup !== null && /wa\.me|api\.whatsapp\.com/.test(popup.url()) || p.url().includes("api.whatsapp.com"), popup?.url()?.slice(0, 60) ?? "no popup");
if (popup) await popup.close();
const noteText = await sheet.innerText();
check("sheet explains the attach fallback on this browser",
  /attach|paperclip|downloads/i.test(noteText), noteText.slice(0, 80));

/* sheet closes cleanly */
await sheet.getByRole("button", { name: /close/i }).click();
check("ESC/close dismisses the sheet", !(await sheet.isVisible()));

const printProbe = await page.evaluate((u) => fetch(u + "/print?noprint=1").then((r) => r.status), docUrl);
check("print route still serves (?noprint too)", printProbe === 200);

await page.goto(`${docUrl}/print?noprint=1`, { waitUntil: "networkidle" });
const sheetText = await page.locator(".print-sheet").innerText();
check("print sheet shows explicit 'Amount paid ₦0'",
  /Amount paid\s+₦0\b/.test(sheetText.replace(/\s+/g, " ")), sheetText.match(/Amount paid[^\n]*/)?.[0]);
check("print sheet shows 'Balance owed ₦150,000'",
  /Balance owed\s+₦150,000/.test(sheetText.replace(/\s+/g, " ")));
check("print sheet never claims 'Paid via' on ₦0 paid",
  !/Paid via/i.test(sheetText));
await page.goto(docUrl, { waitUntil: "networkidle" });

/* ------------------------------------------------ teardown: keep the suite usage-neutral */
await rest(`documents?business_id=eq.${QA_BIZ}`, { method: "DELETE" });
const month = new Date().toISOString().slice(0, 7) + "-01";
await rest(`document_usage?business_id=eq.${QA_BIZ}&period_month=eq.${month}`, { method: "DELETE" });
console.log("teardown: QA documents + usage counter cleared");

console.log(`\nconsole errors: ${consoleErrors.length ? consoleErrors.join(" | ") : "none"}`);
await browser.close();
if (consoleErrors.length) failed++;
console.log(failed ? `\n${failed} FAILED` : "\nall pass");
process.exit(failed ? 1 : 0);
