import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({
  executablePath: CHROME, headless: true, args: ["--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 2500));
await p.evaluate(() => {
  [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === "/about")?.click();
});
const t0 = Date.now();
for (let i = 0; i < 14; i++) {
  const s = await p.evaluate(() => ({
    t: Math.round(performance.now()),
    loader: !!document.querySelector('[role="status"]'),
    url: location.pathname,
  }));
  console.log(`${Date.now() - t0}ms loader=${s.loader} url=${s.url}`);
  if (s.url === "/about" && i > 2) break;
  await new Promise((r) => setTimeout(r, 400));
}
await b.close();
