// Navigation pending probe: nav-link hint fires on slow routes;
// lookup submit → "Loading…" button while router.push resolves.
import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.setViewport({ width: 1440, height: 950 });
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 1500));

// 1. lookup submit → pending button until landlord page commits
await page.type('input[placeholder*="0x"]', "0x5cf8600bbadefd56a70381b8e71eb332d598b2d3");
await page.click('form button[type="submit"]');
await new Promise((r) => setTimeout(r, 250));
const btnText = await page.$eval('form button[type="submit"]', (b) => b.textContent.trim());
console.log("submit btn during nav:", JSON.stringify(btnText));
await page.waitForFunction(() => location.pathname.startsWith("/landlord/"), { timeout: 20000 });
console.log("landed:", await page.url());

// 2. nav link hint — click Feed (dynamic route w/ chain read)
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded" });
await new Promise((r) => setTimeout(r, 800));
await page.click('a[href="/feed"]');
await new Promise((r) => setTimeout(r, 200));
const hint = await page.$eval('a[href="/feed"] .link-hint', (el) => ({
  pending: el.classList.contains("is-pending"),
  vis: getComputedStyle(el).visibility,
})).catch(() => null);
console.log("feed link hint:", JSON.stringify(hint));
await new Promise((r) => setTimeout(r, 2500));
console.log("after nav:", await page.url());
await page.screenshot({ path: "shot-navpend.png" });
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
