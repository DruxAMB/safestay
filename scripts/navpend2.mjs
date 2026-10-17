import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 950 });
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 1200));
await page.click('a[href="/feed"]');
const t0 = Date.now();
await page.waitForFunction(() => location.pathname === "/feed", { timeout: 30000 });
console.log("feed committed in", Date.now() - t0, "ms");
await new Promise((r) => setTimeout(r, 400));
const hintGone = await page.$eval('a[href="/feed"] .link-hint', (el) => !el.classList.contains("is-pending"));
console.log("hint cleared after commit:", hintGone);
const h1 = await page.$eval("h1", (el) => el.textContent.trim());
console.log("feed h1:", h1);
await browser.close();
