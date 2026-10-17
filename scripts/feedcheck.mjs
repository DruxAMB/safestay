import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({
  executablePath: CHROME, headless: true, args: ["--disable-gpu"],
});
const p = await b.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.setViewport({ width: 1100, height: 1200 });
await p.goto("http://localhost:3001/feed", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 3500));
const info = await p.evaluate(() => {
  const rows = [...document.querySelectorAll("main li")];
  const dates = rows.map((li) =>
    [...li.querySelectorAll("span")].map((s) => s.textContent.trim())
      .find((t) => /^\d{4}-\d{2}-\d{2}$/.test(t)) ?? null,
  );
  return {
    rowCount: rows.length,
    dates: dates.slice(0, 8),
    sorted: dates.every((d, i) => !d || i === 0 || !dates[i - 1] || dates[i - 1] >= d),
    historyLinks: document.querySelectorAll('main a[href^="/landlord/"]').length,
    edges: document.querySelectorAll('main li [class*="border-l-"]').length,
    avatars: document.querySelectorAll("main li svg").length,
  };
});
console.log(JSON.stringify(info, null, 1));
console.log("errors:", errors.length ? errors : "none");
await p.screenshot({ path: "shot-feed.png", fullPage: true });
await b.close();
