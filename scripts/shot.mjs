// Screenshot + overflow probe via system Chrome (dev-only tool, not shipped).
// usage: node scripts/shot.mjs <url-path> <out-name> [width] [height]
import puppeteer from "puppeteer-core";

const CHROME =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
// Pass path WITHOUT leading slash (Git Bash mangles /x into C:\...\x): e.g. `debug` or `landlord/0x...`
const [p = "", name = "shot", w = "375", h = "900"] = process.argv.slice(2);
const path = "/" + p.replace(/^[A-Za-z]:[\\/]+/, "").replaceAll("\\", "/");
const width = Number(w);
const height = Number(h);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: width < 500 });
const consoleMsgs = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") consoleMsgs.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => consoleMsgs.push(`pageerror: ${e.message}`));

await page.goto(`http://localhost:${process.env.SHOT_PORT || 3001}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 3500));

const probe = await page.evaluate(() => {
  const vw = window.innerWidth;
  const bad = [...document.querySelectorAll("body *")]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((x) => x.r.right > vw + 1 || x.r.left < -1)
    .map(({ el, r }) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} R=${Math.round(r.right)} L=${Math.round(r.left)}`)
    .slice(0, 10);
  return { vw, scrollW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, bad };
});
await page.screenshot({ path: `../shots/${name}.png` });
console.log(JSON.stringify(probe, null, 1));
if (consoleMsgs.length) console.log("CONSOLE:", consoleMsgs.slice(0, 10).join(" | "));
await browser.close();
