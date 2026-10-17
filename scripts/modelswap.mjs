// Model-swap probe: click the "Skyline Towers" chip → the building should
// switch from the L-block to the high-rise + specimen swaps to hyderabad.
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
await page.screenshot({ path: "../shots/model-lblock.png" });

const chip = (await page.$$("button[aria-pressed]")).find(async () => true);
const chips = await page.$$("button[aria-pressed]");
for (const c of chips) {
  const txt = await c.evaluate((b) => b.innerText);
  if (txt.includes("Skyline")) { await c.click(); break; }
}
await new Promise((r) => setTimeout(r, 1800)); // pop + glow settle
await page.screenshot({ path: "../shots/model-tower.png" });

const after = await page.evaluate(() => ({
  signedBy: [...document.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Signed by"))?.textContent ?? null,
  city: [...document.querySelectorAll("p")].find((p) => p.textContent === "hyderabad") ? "hyderabad" : null,
  pressed: document.querySelectorAll("button[aria-pressed=true]").length,
}));
console.log(JSON.stringify({ after, errs: errs.slice(0, 5) }, null, 1));
await browser.close();
