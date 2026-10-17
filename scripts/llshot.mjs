import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.setViewport({ width: 1440, height: 1600 });
await page.goto(
  "http://localhost:3001/landlord/0x99Ba2FA13d396e7cd013aC350eF1fd6d234224f7",
  { waitUntil: "domcontentloaded", timeout: 90000 },
);
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: "shot-ll.png", fullPage: true });
console.log("errors:", errors.length ? errors : "none");
await browser.close();
