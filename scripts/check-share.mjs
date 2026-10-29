import { chromium } from "@playwright/test";

const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ executablePath: chrome });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const errors = [];

page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(message.text());
  }
});

const login = await context.request.post("http://localhost:3000/api/auth/login", {
  data: { identifier: "lydev", password: "123456" },
});
console.log(`login=${login.status()}`);

await page.goto("http://localhost:3000/dashboard/urls");
await page.waitForSelector("table");
await page.getByRole("button", { name: "Share" }).first().click();

const dialog = page.getByRole("dialog");
await dialog.waitFor();
console.log(`dialog=${await dialog.isVisible()}`);
console.log(`qr_svgs=${await dialog.locator("svg").count()}`);
console.log(`url=${await dialog.locator("p.font-mono").innerText()}`);

await dialog.getByRole("button", { name: "Copy link" }).click();
await page.waitForTimeout(400);
console.log(`toast=${await page.getByText("Link copied.").count()}`);

await page.screenshot({ path: "artifacts/share-dialog.png" });
console.log(`errors=${errors.length}`);
if (errors.length > 0) {
  console.log(errors.join("\n"));
}

await browser.close();
