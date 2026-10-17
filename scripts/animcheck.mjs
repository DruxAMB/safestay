import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu"],
});
const page = await browser.newPage();
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 1500));
const info = await page.evaluate(() => {
  const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let found = null;
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.cssText?.includes(".pop-in") || rule.cssText?.includes("pop-in")) {
          found = rule.cssText.slice(0, 140);
        }
      }
    } catch { /* cross-origin sheet */ }
  }
  return { reducedMotion: rm, popInRule: found };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
