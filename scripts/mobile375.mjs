import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 720 });
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 1500));
const overflow = await page.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth,
);
console.log("375px horizontal overflow:", overflow);
// toast at 375px
await page.type('input[placeholder*="0x"]', "nope");
await page.click('form button[type="submit"]');
await new Promise((r) => setTimeout(r, 600));
const toastBox = await page.$eval('[role="status"]', (el) => {
  const r = el.getBoundingClientRect();
  return { right: Math.round(r.right), vw: window.innerWidth };
});
console.log("toast box:", JSON.stringify(toastBox));
await page.screenshot({ path: "shot-375.png" });
await browser.close();
