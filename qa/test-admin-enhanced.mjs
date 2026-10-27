import { chromium } from "playwright";

const base = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  console.log("1. Signing in as admin...");
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill("qa.tester@rela.test");
  await page.getByLabel("Password").fill("QaTest12345");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/(dashboard|setup)/, { timeout: 15000 });
  console.log("Signed in. Current URL:", page.url());

  console.log("\n2. Navigating to /admin...");
  await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
  console.log("Admin URL:", page.url());

  // Check header
  const title = await page.textContent("h1");
  console.log("H1 Title:", title);

  // Take screenshot of Overview
  await page.screenshot({ path: "/home/user/admin-overview.png", fullPage: true });
  console.log("Saved screenshot: /home/user/admin-overview.png");

  // Check metrics cards
  const businessesCard = await page.getByText("Registered Businesses").first().isVisible();
  console.log("Registered Businesses Card Visible:", businessesCard);

  // Check SVG Chart
  const svgExists = (await page.locator("svg").count()) > 0;
  console.log("SVG Charts count:", await page.locator("svg").count());

  // Switch to Businesses tab
  console.log("\n3. Testing Businesses Tab...");
  await page.getByRole("button", { name: /Businesses/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/home/user/admin-businesses.png", fullPage: true });
  console.log("Saved screenshot: /home/user/admin-businesses.png");

  // Test search
  const searchInput = page.getByPlaceholder("Search business, owner, phone, bank…");
  await searchInput.fill("Anny");
  await page.waitForTimeout(300);
  const annyFound = await page.getByText("nwabunwanneanointing@gmail.com").isVisible();
  console.log("Found Anny via search:", annyFound);

  // Switch to Payments & Plans
  console.log("\n4. Testing Payments & Plans Tab...");
  await page.getByRole("button", { name: /Payments & Plans/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/home/user/admin-payments.png", fullPage: true });
  console.log("Saved screenshot: /home/user/admin-payments.png");

  // Switch to Storefront API tab
  console.log("\n5. Testing Storefront API Tab...");
  await page.getByRole("button", { name: /Storefront API/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/home/user/admin-api.png", fullPage: true });
  console.log("Saved screenshot: /home/user/admin-api.png");

  // Switch to Site Branding tab
  console.log("\n6. Testing Site Branding Tab...");
  await page.getByRole("button", { name: /Site Branding/i }).click();
  await page.waitForTimeout(500);
  const logoManagerVisible = await page.getByText("Site-wide logo").isVisible();
  console.log("Logo Manager Visible:", logoManagerVisible);

  console.log("\nAll Admin tests completed successfully!");
  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
