import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true, args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
for (const [w, h, name] of [[1440, 1400, "ramp2-1440"], [375, 1100, "ramp2-375"]]) {
  await page.setViewport({ width: w, height: h });
  await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({ path: `../shots/${name}.png`, fullPage: true });
}
await browser.close();
console.log("done");
