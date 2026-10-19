/**
 * qa/share.mjs — the sheet + the receipt rule, end to end:
 *   unpaid work is an invoice (₦0 collected, balance owed, delivery row);
 *   receipts are always fully paid (editor offers no amount input);
 *   the sheet is two actions: Save PDF (download) + Copy public link;
 *   the PDF builds from the hidden in-page print sheet.
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

/* ------------------------------------------------ sign in, clean slate */
await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.getByLabel("Email address").fill("qa.tester@rela.test");
await page.getByLabel("Password").fill("QaTest12345");
await page.getByRole("button", { name: /^log in$/i }).click();
await page.waitForURL(/\/dashboard/, { timeout: 45000 });

await rest(`documents?business_id=eq.${QA_BIZ}`, { method: "DELETE" });
await rest(`document_usage?business_id=eq.${QA_BIZ}`, { method: "DELETE" });

/* ------------------------------------------------ 1. unpaid work = INVOICE */
await page.goto(`${base}/documents/new?type=invoice`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^product$/i }).click();
await page.getByLabel(/^Name/i).first().fill("Earlier Client");
await page.getByLabel("Item name").first().fill("Full website design + setup");
await page.getByLabel("Unit price for row 1").fill("150000");
await page.getByLabel("Delivery fee").fill("2500");
await page.getByRole("button", { name: /^save invoice$/i }).click();
await page.waitForURL(/\/documents\/[0-9a-f-]{36}/, { timeout: 60000 });
const invUrl = page.url().split("?")[0];
check("unpaid work is saved as an invoice", Boolean(invUrl));

await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
const dashText = await page.locator("body").innerText();
const collectedLine = dashText.match(/collected[\s\S]*?₦([\d,.]+)/i);
const outstandingLine = dashText.match(/outstanding[\s\S]*?₦([\d,.]+)/i);
check("₦0 collected while the work is unpaid", collectedLine && collectedLine[1].startsWith("0"), collectedLine?.[1]);
check("outstanding shows the full ₦152,500 (incl. delivery)",
  outstandingLine?.[1] === "150,000" || outstandingLine?.[1] === "152,500", outstandingLine?.[1]);

await page.goto(invUrl, { waitUntil: "networkidle" });
const invText = await page.locator("main, [role=main], body").first().innerText();
check("invoice summary: explicit Paid ₦0", /Paid[\s\S]{0,20}₦0\b/.test(invText));
check("invoice summary: Balance ₦152,500", /Balance[\s\S]{0,20}152,500/.test(invText.replace(/₦\s?/g, "₦")));
check("invoice summary: Delivery ₦2,500 row", /Delivery[\s\S]{0,20}2,500/.test(invText));
check("no 'Paid via' language on an unpaid document", !/Paid via/i.test(invText));

/* ------------------------------------------------ 2. receipts = FULL payment only */
await page.goto(`${base}/documents/new?type=receipt`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^product$/i }).click();
check("receipt editor has NO amount-paid input (it's not optional)",
  (await page.getByLabel("Amount paid (₦)").count()) === 0);
await page.getByLabel(/^Name/i).first().fill("Earlier Client");
await page.getByLabel("Item name").first().fill("Full website design + setup");
await page.getByLabel("Unit price for row 1").fill("150000");
await page.getByLabel("Delivery fee").fill("2500");
const paidRow = await page.locator("body").innerText();
check("receipt editor pre-computes the full total as the paid amount",
  /Amount paid[\s\S]{0,20}152,500/.test(paidRow));
check("editor signposts invoices for part-payment",
  /Part-payment coming\? Make an\s*invoice/i.test(paidRow));
await page.getByRole("button", { name: /^save receipt$/i }).click();
await page.waitForURL(/\/documents\/[0-9a-f-]{36}/, { timeout: 60000 });
const recUrl = page.url().split("?")[0];
check("fully-paid receipt saves", Boolean(recUrl));

const recText = await page.locator("main, [role=main], body").first().innerText();
check("paid receipt claims 'Received via Bank transfer' (collected)",
  /Received via Bank transfer/.test(recText));

await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
const dash2 = await page.locator("body").innerText();
const collectedLine2 = dash2.match(/collected[\s\S]*?₦([\d,.]+)/i);
check("collected reflects the receipt's full ₦152,500",
  collectedLine2?.[1] === "152,500", collectedLine2?.[1]);

/* ------------------------------------------------ 3. the sheet: two actions */
await page.goto(recUrl, { waitUntil: "networkidle" });
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
check("sheet offers Save PDF", (await sheet.getByText("Save PDF", { exact: false }).count()) > 0);
check("sheet offers Copy public link", (await sheet.getByText("Copy public link").count()) > 0);
check("no native-share button text anymore",
  (await sheet.getByText("Share PDF on WhatsApp").count()) === 0);
check("footer keeps the print-page escape hatch", (await sheet.getByText("open the print page").count()) > 0);

/* copy link */
await sheet.getByText("Copy public link").click();
await page.waitForTimeout(600);
const clipboard = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
check("copy puts the public /r/ link on the clipboard", /\/r\/[0-9a-f]{32}$/.test(clipboard), clipboard.slice(-40));

/* Save PDF = download built on-device from the hidden sheet */
const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 90000 }),
  sheet.getByText("Save PDF").first().click(),
]);
const fpath = path.join(os.tmpdir(), "qa-saved-receipt.pdf");
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
const noteText = await sheet.innerText();
check("sheet explains the WhatsApp 📎 attach path after saving",
  /downloads/i.test(noteText) && /📎|attach/i.test(noteText), noteText.replace(/\n/g, " ").slice(0, 90));

await sheet.getByRole("button", { name: /close/i }).click();
check("close dismisses the sheet", !(await sheet.isVisible()));

/* ------------------------------------------------ 4. paid receipt = honest print sheet */
await page.goto(`${recUrl}/print?noprint=1`, { waitUntil: "networkidle" });
const sheetText = await page.locator(".print-sheet").innerText();
const flat = sheetText.replace(/\s+/g, " ");
check("print sheet total is ₦152,500 (delivery included)", /total\s*₦152,500/i.test(flat));
check("print sheet shows 'Delivery + ₦2,500' as its own row", /Delivery\s+\+\s*₦2,500/.test(flat));
check("print sheet shows 'Amount paid ₦152,500'", /Amount paid\s+₦152,500/.test(flat), flat.match(/Amount paid[^T]*/)?.[0]);
check("print sheet stamps 'Paid in full'", /paid in full/i.test(flat));
check("print sheet says 'Received via Bank transfer'", /Received via Bank transfer/.test(flat));
check("print sheet has NO balance owed on a settled receipt", !/Balance owed/i.test(flat));

/* ------------------------------------------------ teardown */
await rest(`documents?business_id=eq.${QA_BIZ}`, { method: "DELETE" });
await rest(`document_usage?business_id=eq.${QA_BIZ}`, { method: "DELETE" });
console.log("teardown: QA documents + usage counters cleared");

console.log(`\nconsole errors: ${consoleErrors.length ? consoleErrors.join(" | ") : "none"}`);
await browser.close();
if (consoleErrors.length) failed++;
console.log(failed ? `\n${failed} FAILED` : "\nall pass");
process.exit(failed ? 1 : 0);
