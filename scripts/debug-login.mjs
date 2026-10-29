import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

page.on("console", (message) => console.log(`console ${message.type()}: ${message.text()}`));
page.on("pageerror", (error) => console.log(`pageerror: ${error.message}`));
page.on("requestfailed", (request) =>
  console.log(`requestfailed: ${request.url()} ${request.failure()?.errorText}`),
);

await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
console.log("url before:", page.url());
await page.fill("#identifier", "lydev");
await page.fill("#password", "123456");
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
console.log("url after:", page.url());
console.log((await page.locator("body").innerText()).slice(0, 600));

await browser.close();
