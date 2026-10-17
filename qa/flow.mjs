import { chromium } from "playwright";

const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE " + m.text().slice(0, 160)); });

async function step(name, fn) {
  try { await fn(); console.log("PASS", name); }
  catch (e) { console.log("FAIL", name, "-", e.message.split("\n")[0]); throw e; }
}

await step("login page loads", async () => {
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /welcome back/i }).waitFor();
});

await step("wrong password shows friendly error", async () => {
  await page.getByLabel("Email address").fill("qa.tester@rela.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.getByRole("alert").waitFor({ timeout: 10000 });
  console.log("   →", (await page.getByRole("alert").textContent()).trim().slice(0, 80));
});

await step("email survives the failed attempt", async () => {
  const value = await page.getByLabel("Email address").inputValue();
  if (value !== "qa.tester@rela.test") throw new Error("email was wiped: " + value);
});

await step("correct password signs in and redirects to setup", async () => {
  const btn = page.getByRole("button", { name: /^log in$/i });
  await btn.waitFor();
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /log in/i.test(x.textContent || ""));
    return b && !b.disabled;
  });
  await page.getByLabel("Email address").fill("qa.tester@rela.test");
  await page.getByLabel("Password").fill("QaTest12345");
  await btn.click();
  await page.waitForURL(/\/(setup|dashboard)/, { timeout: 45000, waitUntil: "commit" });

  // First run lands in setup; later runs go straight to the dashboard.
  if (page.url().includes("/dashboard")) {
    console.log("   (account already set up — skipping setup steps)");
    return;
  }
  await page.getByRole("heading", { name: /tell us about your business/i }).waitFor({ timeout: 20000 });
});

await step("business step validates phone", async () => {
  if (page.url().includes("/dashboard")) return;
  await page.getByLabel("Business name").fill("Adaeze Fabrics");
  await page.getByLabel("Business address").fill("12 Allen Avenue, Ikeja, Lagos");
  await page.getByLabel("Phone number").fill("12");
  await page.getByRole("button", { name: /continue to branding/i }).click();
  await page.getByText(/use a nigerian number/i).waitFor({ timeout: 8000 });
});

await step("business step saves", async () => {
  if (page.url().includes("/dashboard")) return;   // already-onboarded run
  await page.getByLabel("Phone number").fill("08031234567");
  await page.getByRole("button", { name: /continue to branding/i }).click();
  await page.waitForURL(/\/setup\/branding/, { timeout: 45000, waitUntil: "commit" });
  await page.screenshot({ path: "/tmp/f1-branding.png", fullPage: true });
});

await step("logo upload", async () => {
  if (page.url().includes("/dashboard")) return;   // already-onboarded run
  const buffer = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" rx="24" fill="#453027"/><text x="100" y="130" font-size="90" font-family="serif" fill="#F2EBD1" text-anchor="middle">A</text></svg>',
  );
  await page.setInputFiles('input[aria-label="Upload business logo"]', {
    name: "logo.png",
    mimeType: "image/png",
    buffer,
  });
  await page.getByText("Uploaded", { exact: true }).waitFor({ timeout: 25000 });
});

await step("continue to preferences", async () => {
  if (page.url().includes("/dashboard")) return;   // already-onboarded run
  await page.getByRole("button", { name: /continue to preferences/i }).click();
  await page.waitForURL(/\/setup\/preferences/, { timeout: 45000, waitUntil: "commit" });
});

await step("preferences save and land on dashboard", async () => {
  if (page.url().includes("/dashboard")) return;   // already-onboarded run
  await page.getByRole("button", { name: /services/i }).click();
  await page.getByLabel("Bank name").fill("GTBank");
  await page.getByLabel("Account name").fill("Adaeze Okafor");
  await page.getByLabel("Account number").fill("0123456789");
  await page.screenshot({ path: "/tmp/f2-preferences.png", fullPage: true });
  await page.getByRole("button", { name: /finish setup/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45000, waitUntil: "commit" });
  await page.screenshot({ path: "/tmp/f3-dashboard-empty.png", fullPage: true });
});

await step("create sheet opens", async () => {
  await page.getByRole("button", { name: /create document/i }).first().click();
  await page.getByRole("dialog", { name: /create a document/i }).waitFor();
  await page.screenshot({ path: "/tmp/f4-create-sheet.png" });
});

await step("receipt editor opens in service mode", async () => {
  await page.getByRole("link", { name: /receipt/i }).click();
  await page.waitForURL(/\/documents\/new\?type=receipt/, { timeout: 30000, waitUntil: "commit" });
  await page.getByRole("heading", { name: /new receipt/i }).waitFor();
});

await step("service mode hides quantity", async () => {
  const qtyInputs = await page.locator('input[aria-label^="Qty for row"]').count();
  if (qtyInputs !== 0) throw new Error("quantity input visible in service mode");
});

await step("validation blocks empty save", async () => {
  await page.getByRole("button", { name: /save receipt/i }).click();
  await page.getByRole("alert").first().waitFor({ timeout: 10000 });
  console.log("   →", (await page.getByRole("alert").first().textContent()).trim().slice(0, 60));
});

await step("fill and save receipt", async () => {
  await page.getByPlaceholder("Chinedu Okafor").first().fill("Chinedu Okafor");
  await page.getByPlaceholder("0803 123 4567").first().fill("08099887766");
  await page.getByLabel("Service name").first().fill("Website design");
  await page.getByLabel("Description").first().fill("E-commerce site, three revisions, delivery in seven days");
  await page.getByLabel("Rate for row 1").first().fill("350000");
  await page.screenshot({ path: "/tmp/f5-editor.png", fullPage: true });
  await page.getByRole("button", { name: /save receipt/i }).click();
  await page.waitForURL(/\/documents\/[0-9a-f-]{36}/, { timeout: 45000, waitUntil: "commit" });
  await page.screenshot({ path: "/tmp/f6-receipt-saved.png", fullPage: true });
});

await step("document number format", async () => {
  const text = await page.locator("main").innerText();
  const match = text.match(/REC-\d{8}-\d{4}/);
  if (!match) throw new Error("no REC number found");
  console.log("   →", match[0]);
});

await step("public verification page renders without auth", async () => {
  const link = await page.getByRole("link", { name: /open public verification page/i }).getAttribute("href");
  const anon = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await anon.newPage();
  const res = await p2.goto(base + link, { waitUntil: "networkidle" });
  if (res.status() !== 200) throw new Error("status " + res.status());
  await p2.getByText(/verified with rela/i).first().waitFor();
  const body = await p2.locator("main").innerText();
  if (body.includes("internal") || body.includes("password")) throw new Error("leaked internal field");
  await p2.screenshot({ path: "/tmp/f7-public.png", fullPage: true });
  await anon.close();
  console.log("   ✓ no login required, no internal fields");
});

await step("protected route redirects anonymous visitor", async () => {
  const anon = await browser.newContext();
  const p3 = await anon.newPage();
  await p3.goto(base + "/dashboard", { waitUntil: "networkidle" });
  await p3.waitForURL(/\/login/, { timeout: 20000, waitUntil: "commit" });
  await anon.close();
});

await step("dashboard shows the saved receipt", async () => {
  await page.goto(base + "/dashboard", { waitUntil: "networkidle" });
  await page.getByText("Chinedu Okafor").first().waitFor({ timeout: 10000 });
  await page.screenshot({ path: "/tmp/f8-dashboard.png", fullPage: true });
});

console.log("\nconsole errors:", errors.length ? errors.slice(0, 6) : "none");
await browser.close();
