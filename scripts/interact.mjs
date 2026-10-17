// Interaction probe: click a directory chip → verify specimen swaps,
// "View full history" appears, button flips to its second stage.
// usage: node scripts/interact.mjs
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));

await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
// wait for the live directory chips to render
await page.waitForFunction(
  () => [...document.querySelectorAll("button")].some((b) => b.getAttribute("aria-pressed") === "false"),
  { timeout: 30000 },
).catch(() => null);
await new Promise((r) => setTimeout(r, 1500));

const before = await page.evaluate(() => ({
  key: document.body.innerText.match(/0x[0-9a-f]{20,}/)?.[0] ?? null,
  signedBy: [...document.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Signed by"))?.textContent ?? null,
}));

// click the second chip (a different landlord)
const chips = await page.$$("button[aria-pressed]");
await chips[1].click();
await new Promise((r) => setTimeout(r, 1200));

const after = await page.evaluate(() => ({
  signedBy: [...document.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Signed by"))?.textContent ?? null,
  link: !!document.querySelector('a[href^="/landlord/0x"]'),
  btn: [...document.querySelectorAll("button[type=submit]")].map((b) => b.textContent?.trim())[0] ?? null,
  pressed: [...document.querySelectorAll("button[aria-pressed=true]")].length,
}));

await page.screenshot({ path: "../shots/interact-chip.png" });
console.log(JSON.stringify({ before, after, errs: errs.slice(0, 5) }, null, 1));
await browser.close();
