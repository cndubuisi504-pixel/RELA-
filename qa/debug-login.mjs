import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on("console", (m) => console.log("console:", m.type(), m.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("pageerror:", e.message.slice(0, 300)));
page.on("response", async (r) => {
  if (r.request().method() === "POST" || r.url().includes("/login")) {
    console.log("resp", r.status(), r.url().replace("http://localhost:3000", ""));
  }
});

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel("Email address").fill("qa.tester@rela.test");
await page.getByLabel("Password").fill("QaTest12345");
await page.getByRole("button", { name: /^log in$/i }).click();
await page.waitForTimeout(6000);
console.log("URL:", page.url());
const alerts = await page.locator('[role="alert"]').allTextContents();
console.log("alerts:", alerts);
console.log("cookies:", (await ctx.cookies()).map((c) => `${c.name}=${c.value.slice(0, 12)}…`).join(", ") || "none");
await page.screenshot({ path: "/tmp/debug-login.png", fullPage: true });
await browser.close();
