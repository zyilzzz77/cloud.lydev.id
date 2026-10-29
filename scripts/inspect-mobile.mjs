import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto("http://localhost:3000/login");
await page.fill("#identifier", "lydev");
await page.fill("#password", "123456");
await Promise.all([
  page.waitForURL("**/dashboard"),
  page.click('button[type="submit"]'),
]);

await page.click('button[aria-label="Open navigation"]');
await page.waitForTimeout(250);

const aside = page.locator("aside").last();
console.log("aside count:", await page.locator("aside").count());
console.log("aside class:", await aside.getAttribute("class"));
console.log("aside background:", await aside.evaluate((el) => getComputedStyle(el).backgroundColor));
console.log("aside position:", await aside.evaluate((el) => getComputedStyle(el).position));
console.log("aside z-index:", await aside.evaluate((el) => getComputedStyle(el).zIndex));
console.log(
  "header backdrop-filter:",
  await page.locator("header").first().evaluate((el) => getComputedStyle(el).backdropFilter),
);

await mkdir("artifacts", { recursive: true });
await page.screenshot({ path: "artifacts/mobile-drawer.png" });
await browser.close();
