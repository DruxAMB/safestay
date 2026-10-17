// Scene-interaction probe: (1) sweep for a lit unit, click it, assert the
// landlord gets selected (chip pressed / specimen swap); (2) drag the
// canvas and assert the rendered pixels actually changed (rotation).
// usage: node scripts/scenepoke.mjs
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
await new Promise((r) => setTimeout(r, 3500));

const canvas = await page.$("canvas");
const box = await canvas.boundingBox();
const tipOf = () => page.evaluate(() => {
  const c = document.querySelector("canvas");
  const tip = c?.parentElement?.querySelector("div");
  return tip && tip.style.display === "block" ? tip.innerText.trim() : null;
});

// 1) find a lit unit, then click it
let unitPoint = null;
outer: for (let fx = 0.45; fx <= 0.98; fx += 0.04) {
  for (let fy = 0.15; fy <= 0.92; fy += 0.05) {
    const x = box.x + box.width * fx, y = box.y + box.height * fy;
    await page.mouse.move(x, y);
    await new Promise((r) => setTimeout(r, 25));
    if (await tipOf()) { unitPoint = { x, y }; break outer; }
  }
}

let click = { found: !!unitPoint };
if (unitPoint) {
  const beforeSig = await page.evaluate(
    () => [...document.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Signed by"))?.textContent ?? null,
  );
  await page.mouse.click(unitPoint.x, unitPoint.y);
  await new Promise((r) => setTimeout(r, 1200));
  click = {
    ...click,
    beforeSig,
    afterSig: await page.evaluate(
      () => [...document.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Signed by"))?.textContent ?? null,
    ),
    pressed: await page.evaluate(() => document.querySelectorAll("button[aria-pressed=true]").length),
    link: await page.evaluate(() => !!document.querySelector('a[href^="/landlord/0x"]')),
  };
}

// 2) drag empty canvas space → pixels must differ (tower rotated)
const shotAt = async () => {
  const clip = { x: box.x + box.width * 0.55, y: box.y + box.height * 0.4, width: box.width * 0.4, height: box.height * 0.5 };
  return page.screenshot({ clip });
};
const s1 = await shotAt();
const dragAt = { x: box.x + box.width * 0.8, y: box.y + box.height * 0.55 };
await page.mouse.move(dragAt.x, dragAt.y);
await page.mouse.down();
for (let i = 1; i <= 10; i++) {
  await page.mouse.move(dragAt.x - i * 22, dragAt.y);
  await new Promise((r) => setTimeout(r, 16));
}
await page.mouse.up();
await new Promise((r) => setTimeout(r, 300));
const s2 = await shotAt();
const rotated = !Buffer.from(s1).equals(Buffer.from(s2));

console.log(JSON.stringify({ click, rotated, errs: errs.slice(0, 5) }, null, 1));
await browser.close();
