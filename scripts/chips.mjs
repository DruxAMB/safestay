// Directory check: list the landlord chips + stats strip, screenshot hero.
import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 950 });
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(
  () => [...document.querySelectorAll("button")].some((b) => b.getAttribute("aria-pressed") === "false"),
  { timeout: 40000 },
).catch(() => null);
await new Promise((r) => setTimeout(r, 4000));
const chips = await page.evaluate(() =>
  [...document.querySelectorAll("button[aria-pressed]")].map((b) => b.innerText.replace(/\n/g, " ")));
const stats = await page.evaluate(() => [...document.querySelectorAll("dd")].map((d) => d.innerText));
await page.screenshot({ path: "../shots/hero-4landlords.png" });
console.log(JSON.stringify({ chips, stats }, null, 1));
await browser.close();
