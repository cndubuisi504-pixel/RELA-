import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on("response", async (r) => {
  if (r.request().method() === "POST") console.log("POST", r.status(), r.url().replace("http://localhost:3000", ""));
});
page.on("framenavigated", (f) => { if (f === page.mainFrame()) console.log("nav:", f.url().replace("http://localhost:3000", "")); });

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });

// attempt 1: wrong
await page.getByLabel("Email address").fill("qa.tester@rela.test");
await page.getByLabel("Password").fill("nope-nope-nope");
await page.getByRole("button", { name: /^log in$/i }).click();
await page.waitForTimeout(4000);
console.log("after wrong → url:", page.url(), "| alert:", await page.locator('[role="alert"]').first().textContent().catch(() => "none"));
console.log("email field now:", await page.getByLabel("Email address").inputValue());

// attempt 2: correct
await page.getByLabel("Email address").fill("qa.tester@rela.test");
await page.getByLabel("Password").fill("QaTest12345");
await page.getByRole("button", { name: /^log in$/i }).click();
await page.waitForTimeout(7000);
console.log("after correct → url:", page.url());
console.log("alerts:", await page.locator('[role="alert"]').allTextContents());
await page.screenshot({ path: "/tmp/debug2.png", fullPage: true });
await browser.close();
