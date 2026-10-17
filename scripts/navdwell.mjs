import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({
  executablePath: CHROME, headless: true, args: ["--disable-gpu"],
});
const p = await b.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:3001/feed", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 2500));

async function nav(href, label) {
  const from = await p.evaluate(() => location.pathname);
  const t0 = Date.now();
  await p.evaluate((h) => {
    [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === h)?.click();
  }, href);
  let shownAt = null, committedAt = null, goneAt = null;
  for (let i = 0; i < 80; i++) {
    const s = await p.evaluate((f) => ({
      overlay: !!document.querySelector(".lb-floor"),
      moved: location.pathname !== f,
    }), from);
    if (s.overlay && shownAt === null) shownAt = Date.now();
    if (s.moved && committedAt === null) committedAt = Date.now();
    if (shownAt !== null && !s.overlay) { goneAt = Date.now(); break; }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`${label}: shown=${shownAt ? shownAt - t0 : "never"}ms committed=${committedAt ? committedAt - t0 : "n/a"}ms held=${goneAt && shownAt ? goneAt - shownAt : 0}ms → ${await p.evaluate(() => location.pathname)}`);
}

await nav("/about", "feed → about");
await new Promise((r) => setTimeout(r, 500));
await nav("/", "about → / (instant-ish)");
console.log("errors:", errors.length ? errors : "none");
await b.close();
