// Toast + modal motion probe: bad lookup → danger toast; picker → pop-in;
// toast auto-dismiss lifecycle.
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
await page.waitForFunction(
  () => [...document.querySelectorAll("input")].length > 0,
  { timeout: 20000 },
);
await new Promise((r) => setTimeout(r, 1200));

// 1. bad lookup → inline error + danger toast
await page.type('input[placeholder*="0x"]', "definitely-not-a-landlord");
await page.click('form button[type="submit"]');
await new Promise((r) => setTimeout(r, 800));
const toasts = await page.$$eval('[role="status"]', (els) =>
  els.map((e) => e.textContent.trim().slice(0, 90)),
);
console.log("toasts:", JSON.stringify(toasts));
await page.screenshot({ path: "shot-toast.png" });

// 2. wallet picker pop-in
await page.click('button[aria-label="Connect wallet"]');
await new Promise((r) => setTimeout(r, 350));
const anim = await page.$eval('[role="dialog"]', (el) => getComputedStyle(el).animationName);
console.log("modal animation:", anim);
await page.screenshot({ path: "shot-picker.png" });
await page.keyboard.press("Escape");

// 3. auto-dismiss — toast should be gone within ~7s of its creation
await new Promise((r) => setTimeout(r, 6500));
const left = await page.$$eval('[role="status"]', (els) => els.length);
console.log("toasts remaining after ttl:", left);

console.log("page errors:", errors.length ? errors : "none");
await browser.close();
