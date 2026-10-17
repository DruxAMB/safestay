import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({
  executablePath: CHROME, headless: true, args: ["--disable-gpu"],
});
const p = await b.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.setViewport({ width: 375, height: 900 });
await p.goto("http://localhost:3001/feed", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 3000));
const overflow = await p.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
);
console.log("375px overflow:", overflow, "| errors:", errors.length ? errors : "none");
await p.screenshot({ path: "shot-feed-375.png" });
await b.close();
