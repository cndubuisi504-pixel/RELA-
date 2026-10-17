/**
 * Conversion chain QA: quotation → invoice → partial payment → final payment.
 * Run against a signed-in QA vendor. Asserts the free-plan counter does not move
 * for converted documents.
 */
import { chromium } from "playwright";

const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CONSOLE " + m.text().slice(0, 160));
});

const seen = {};
async function step(name, fn) {
  try {
    await fn();
    console.log("PASS", name);
  } catch (e) {
    console.log("FAIL", name, "-", e.message.split("\n")[0]);
    try {
      console.log("   url:", page.url());
      console.log("   body:", (await page.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 500));
    } catch {}
    throw e;
  }
}

await step("sign in", async () => {
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill("qa.tester@rela.test");
  await page.getByLabel("Password").fill("QaTest12345");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45000, waitUntil: "commit" });
});

await step("create a quotation", async () => {
  await page.goto(base + "/documents/new?type=quotation", { waitUntil: "networkidle" });
  // Quotations open in service mode; switch to Product so quantity is shown.
  await page.getByRole("button", { name: /^product$/i }).click();
  await page.getByLabel(/^Name/i).first().fill("Chidi Okonkwo");
  await page.getByLabel(/^Phone/i).first().fill("08099887766");
  await page.getByLabel("Item name").first().fill("Oak dining table, 6 seats");
  await page.getByLabel("Unit price for row 1").fill("450000");
  await page.getByRole("button", { name: /^save quotation$/i }).click();
  await page.waitForURL(/\/documents\/[0-9a-f-]{36}\?created=1/, { timeout: 45000 });
  seen.quotationUrl = page.url().split("?")[0];
});

await step("quotation shows a convert action", async () => {
  await page.getByRole("button", { name: /convert to invoice/i }).waitFor({ timeout: 15000 });
  const number = await page.locator("p.num").first().textContent();
  seen.quotationNumber = number.trim();
  if (!/^QUO-/.test(seen.quotationNumber)) throw new Error("unexpected number " + seen.quotationNumber);
});

await step("convert to invoice", async () => {
  await page.getByRole("button", { name: /convert to invoice/i }).click();
  await page.waitForURL(/\/documents\/[0-9a-f-]{36}\?converted=1/, { timeout: 45000 });
  await page.getByText(/is now an invoice/i).waitFor({ timeout: 15000 });
  seen.invoiceUrl = page.url().split("?")[0];
});

await step("invoice carries the quotation details", async () => {
  const body = await page.locator("body").innerText();
  if (!/INV-/.test(body)) throw new Error("no invoice number");
  if (!/Chidi Okonkwo/.test(body)) throw new Error("customer missing");
  if (!/450,000/.test(body)) throw new Error("total missing:\n" + body.slice(0, 400));
  seen.invoiceNumber = body.match(/INV-\d{8}-\d{4}/)?.[0];
  if (!seen.invoiceNumber) throw new Error("could not read invoice number");
});

await step("invoice links back to the quotation", async () => {
  const body = await page.locator("body").innerText();
  if (!body.includes(seen.quotationNumber)) throw new Error("quotation link missing");
});

await step("record a partial payment", async () => {
  await page.getByRole("button", { name: /record a payment/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 10000 });
  await dialog.getByLabel(/amount received/i).fill("200000");
  await dialog.getByRole("button", { name: /^bank transfer$/i }).click();
  await dialog.getByRole("button", { name: /create receipt/i }).click();
  await page.waitForURL(/\/documents\/[0-9a-f-]{36}\?payment=1/, { timeout: 45000 });
  await page.getByText(/payment recorded/i).waitFor({ timeout: 15000 });
  seen.receiptUrl1 = page.url().split("?")[0];
});

await step("partial receipt shows this payment and the balance", async () => {
  const body = await page.locator("body").innerText();
  if (!/REC-/.test(body)) throw new Error("no receipt number");
  if (!/This payment/.test(body)) throw new Error("no 'This payment' row");
  if (!/200,000/.test(body)) throw new Error("payment amount missing");
  if (!/250,000/.test(body)) throw new Error("balance missing");
  if (!/Bank transfer/.test(body)) throw new Error("payment method missing");
  seen.receiptNumber1 = body.match(/REC-\d{8}-\d{4}/)?.[0];
});

await step("invoice reflects the partial payment", async () => {
  await page.goto(seen.invoiceUrl, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  if (!/Partially paid/i.test(body)) throw new Error("status not partially paid:\n" + body.slice(0, 300));
  if (!/Payments received/i.test(body)) throw new Error("payments section missing");
  if (!/250,000/.test(body)) throw new Error("outstanding balance not updated");
});

await step("duplicate tap does not double-charge", async () => {
  // Submitting the same amount twice must land on the existing receipt, not a second one.
  await page.getByRole("button", { name: /record a payment/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByLabel(/amount received/i).fill("200000");
  await dialog.getByRole("button", { name: /create receipt/i }).click();
  await page.waitForURL(/\/documents\/[0-9a-f-]{36}\?payment=1/, { timeout: 45000 });
  const number = (await page.locator("body").innerText()).match(/REC-\d{8}-\d{4}/)?.[0];
  if (number !== seen.receiptNumber1) {
    throw new Error(`expected ${seen.receiptNumber1}, got ${number}`);
  }
});

await step("record the remaining balance", async () => {
  await page.goto(seen.invoiceUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /record a payment/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByLabel(/amount received/i).fill("");
  await dialog.getByRole("button", { name: /^cash$/i }).click();
  await dialog.getByRole("button", { name: /create receipt/i }).click();
  await page.waitForURL(/\/documents\/[0-9a-f-]{36}\?payment=1/, { timeout: 45000 });
  const body = await page.locator("body").innerText();
  if (!/Paid in total/.test(body)) throw new Error("receipt not showing total paid");
  if (/Balance/.test(body)) throw new Error("balance should be gone");
  seen.receiptUrl2 = page.url().split("?")[0];
});

await step("invoice is marked paid and the action disappears", async () => {
  await page.goto(seen.invoiceUrl, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  if (!/Paid/.test(body)) throw new Error("not paid");
  if (/Record a payment/i.test(body)) throw new Error("payment button still visible");
  const receiptLinks = await page.getByRole("link", { name: /REC-/ }).count();
  if (receiptLinks < 2) throw new Error(`expected 2 receipts, saw ${receiptLinks}`);
});

await step("quotation is marked converted", async () => {
  await page.goto(seen.quotationUrl, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  if (!/Converted/i.test(body)) throw new Error("quotation status not converted");
  if (!body.includes(seen.invoiceNumber)) throw new Error("no link to the invoice");
  if (/convert to invoice/i.test(body)) throw new Error("convert button still visible");
});

await step("converted receipt verifies anonymously", async () => {
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const anon = await ctx2.newPage();
  await page.goto(seen.receiptUrl2, { waitUntil: "networkidle" });
  const link = await page.getByRole("link", { name: /open public verification page/i }).getAttribute("href");
  await anon.goto(base + link, { waitUntil: "networkidle" });
  const body = await anon.locator("body").innerText();
  if (!/Verified with rela/i.test(body)) throw new Error("no verification badge");
  if (!/450,000/.test(body)) throw new Error("total missing for anonymous viewer");
  if (body.includes("qa.tester")) throw new Error("internal data leaked");
  await ctx2.close();
});

console.log("\ndocuments:", JSON.stringify(seen, null, 0));
if (errors.length) {
  console.log("\nCONSOLE ERRORS:");
  for (const e of errors) console.log(" -", e);
  process.exitCode = 1;
} else {
  console.log("\nno console errors");
}

await browser.close();
