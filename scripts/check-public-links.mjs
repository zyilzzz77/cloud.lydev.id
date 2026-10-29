import { chromium } from "@playwright/test";

const base = "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.fill("#identifier", "lydev");
await page.fill("#password", "123456");
await Promise.all([page.waitForURL("**/dashboard"), page.click('button[type="submit"]')]);

async function api(path) {
  const response = await context.request.get(`${base}${path}`);
  return (await response.json()).data;
}

const urls = await api("/api/urls");
const cdn = await api("/api/cdn");
const dl = await api("/api/dl");

const shortLink = urls.items[0]?.shortUrl;
const cdnLink = cdn.items[0]?.publicUrl;
const dlLink = dl.items[0]?.publicUrl;

console.log(`short link: ${shortLink}`);
console.log(`cdn link: ${cdnLink}`);
console.log(`download link: ${dlLink}`);

for (const [label, link] of [
  ["short", shortLink],
  ["cdn", cdnLink],
  ["download", dlLink],
]) {
  if (!link) {
    console.log(`${label}: no item`);
    continue;
  }

  const response = await context.request.get(link, { maxRedirects: 0 });
  console.log(`${label}: status=${response.status()} location=${response.headers()["location"] ?? ""}`);
}

await page.goto(`${base}/dashboard/files`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(600);
const fileRow = page.locator("table tbody tr").first();
console.log("files table first row:", (await fileRow.innerText()).replace(/\s+/g, " ").slice(0, 180));

await page.goto(`${base}/dashboard/cdn`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(600);
const assetRow = page.locator("table tbody tr").first();
console.log("cdn table first row:", (await assetRow.innerText()).replace(/\s+/g, " ").slice(0, 180));

await browser.close();
