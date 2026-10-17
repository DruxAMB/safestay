// Unit-marker probe: sweeps the pointer across the building area and
// checks whether the entity tooltip ever appears, plus what it says.
// usage: node scripts/unitprobe.mjs
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));

await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForSelector("canvas", { timeout: 30000 }).catch(() => null);
await new Promise((r) => setTimeout(r, 3500)); // let markers ignite + settle

const found = { hits: 0, samples: [] };
const canvas = await page.$("canvas");
if (!canvas) {
  console.log(JSON.stringify({ found, errs: ["no canvas"] }));
  await browser.close();
  process.exit(0);
}
const box = await canvas.boundingBox();

// grid sweep over the right ~60% of the hero where the tower sits
for (let fx = 0.45; fx <= 0.98; fx += 0.045) {
  for (let fy = 0.15; fy <= 0.92; fy += 0.06) {
    const x = box.x + box.width * fx;
    const y = box.y + box.height * fy;
    await page.mouse.move(x, y);
    await new Promise((r) => setTimeout(r, 30));
    const tip = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      const tip = c?.parentElement?.querySelector("div");
      return tip && tip.style.display === "block"
        ? tip.innerText.trim().replace(/\n/g, " | ")
        : null;
    });
    if (tip) {
      found.hits++;
      if (found.samples.length < 4 && !found.samples.includes(tip)) found.samples.push(tip);
    }
  }
}

console.log(JSON.stringify({ found, errs: errs.slice(0, 5) }, null, 1));
await browser.close();
