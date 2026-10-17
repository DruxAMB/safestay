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
// type a wallet and submit — exercises the router.push → safestay:nav path
await p.type('input[type="text"], input:not([type])', "0x99Ba2FA13d396e7cd013aC350eF1fd6d234224f7");
await p.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => /check history/i.test(b.textContent))?.click();
});
await new Promise((r) => setTimeout(r, 1400));
const mid = await p.evaluate(() => ({
  overlayPresent: !!document.querySelector(".lb-floor"),
  url: location.pathname,
}));
console.log("mid-nav (router.push):", JSON.stringify(mid));
await p.screenshot({ path: "shot-navloader2.png" });
await p.waitForFunction(() => location.pathname.startsWith("/landlord/"), { timeout: 40000 });
await new Promise((r) => setTimeout(r, 600));
console.log("post:", await p.evaluate(() => location.pathname),
  "| overlayGone:", await p.evaluate(() => !document.querySelector(".lb-floor")));
console.log("errors:", errors.length ? errors : "none");
await b.close();
