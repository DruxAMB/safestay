import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true, args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 3000));
const applied = await page.evaluate(() => {
  const el = document.querySelector(".bg-stipple");
  return el ? getComputedStyle(el).backgroundImage.slice(0, 60) : "NOT FOUND";
});
console.log("bg:", applied);
await page.screenshot({ path: "../shots/stipple-zoom.png", clip: { x: 950, y: 60, width: 400, height: 300 } });
await browser.close();
