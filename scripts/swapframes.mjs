// Capture the swap transition mid-flight: click Skyline chip, then shoot
// during the collapse (~150ms), during the rise (~350ms), and settled.
import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 950 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(
  () => [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Skyline")),
  { timeout: 40000 },
).catch(() => null);
await new Promise((r) => setTimeout(r, 3500));

const chips = await page.$$("button[aria-pressed]");
for (const c of chips) {
  const txt = await c.evaluate((b) => b.innerText);
  if (txt.includes("Skyline")) { await c.click(); break; }
}
await new Promise((r) => setTimeout(r, 140));
await page.screenshot({ path: "../shots/swap-collapse.png" });
await new Promise((r) => setTimeout(r, 250));
await page.screenshot({ path: "../shots/swap-rise.png" });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: "../shots/swap-done.png" });
console.log(JSON.stringify({ errs: errs.slice(0, 5) }));
await browser.close();
