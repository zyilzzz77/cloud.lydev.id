import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = "http://localhost:3000";
const pages = [
  "/",
  "/dashboard",
  "/dashboard/cdn",
  "/dashboard/urls",
  "/dashboard/files",
  "/dashboard/activity",
  "/dashboard/settings/profile",
  "/dashboard/settings/security",
  "/dashboard/settings/storage",
  "/dashboard/settings/api-keys",
  "/docs/api",
];

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

const errors = [];

async function run(viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${label} console: ${message.text()}`);
    }
  });

  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.fill("#identifier", "lydev");
  await page.fill("#password", "123456");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.click('button[type="submit"]'),
  ]);

  for (const path of pages) {
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    const result = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      title: document.title,
    }));

    console.log(`${label} ${path} overflow=${result.overflow} title=${result.title}`);
  }

  await page.goto(`${base}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: `artifacts/${label}-dashboard.png` });

  if (label === "mobile") {
    await page.click('button[aria-label="Open navigation"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: "artifacts/mobile-nav-fixed.png" });
  }

  await context.close();
}

await run({ width: 1440, height: 900 }, "desktop");
await run({ width: 390, height: 844 }, "mobile");

console.log(`errors=${errors.length}`);
for (const error of errors) {
  console.log(error);
}

await browser.close();
