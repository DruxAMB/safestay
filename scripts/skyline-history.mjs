import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({
  executablePath: CHROME, headless: true, args: ["--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 1400 });
await p.goto("http://localhost:3001/landlord/0x5cf8600bbadefd56a70381b8e71eb332d598b2d3",
  { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 2500));
const awaiting = await p.evaluate(() =>
  [...document.querySelectorAll("span")].filter(
    (e) => e.textContent.trim() === "awaiting outcome",
  ).length,
);
console.log("awaiting-outcome badges on Skyline:", awaiting);
await p.screenshot({ path: "shot-ll-skyline.png" });
await b.close();
