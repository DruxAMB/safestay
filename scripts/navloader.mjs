import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({
  executablePath: CHROME, headless: true, args: ["--disable-gpu"],
});
const p = await b.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 2500));
await p.evaluate(() => {
  [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === "/feed")?.click();
});
await new Promise((r) => setTimeout(r, 1400));
const mid = await p.evaluate(() => {
  const floor = document.querySelector(".lb-floor");
  const cs = floor ? getComputedStyle(floor) : null;
  const overlay = floor?.closest(".fixed.inset-0");
  return {
    overlayPresent: !!overlay,
    floors: document.querySelectorAll(".lb-floor").length,
    animation: cs ? `${cs.animationName} ${cs.animationDuration} ${cs.animationIterationCount}` : null,
    transform: cs?.transform ?? null,
    url: location.pathname,
  };
});
console.log("mid-nav:", JSON.stringify(mid));
await p.screenshot({ path: "shot-navloader.png" });
await p.waitForFunction(() => location.pathname === "/feed", { timeout: 40000 });
await new Promise((r) => setTimeout(r, 600));
const after = await p.evaluate(() => ({
  overlayGone: !document.querySelector(".lb-floor"),
  url: location.pathname,
}));
console.log("post-nav:", JSON.stringify(after));
console.log("errors:", errors.length ? errors : "none");
await b.close();
