// Simulates a broken wallet: window.ethereum exists but eth_accounts
// hangs forever (the exact failure the user hit). Verifies the UI
// settles to the connect state instead of pulsing forever.
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const url = process.argv[2] || "http://localhost:3001/record";

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

await page.evaluateOnNewDocument(() => {
  window.ethereum = {
    request: () => new Promise(() => {}), // hangs forever — never resolves
    on: () => {},
    removeListener: () => {},
  };
});

const t0 = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await new Promise((r) => setTimeout(r, 1500)); // let client JS hydrate + mount
// poll for up to 8s for the connect button text to appear
let state = "timeout";
for (let i = 0; i < 16; i++) {
  state = await page.evaluate(() => {
    const txt = document.body.innerText;
    if (txt.includes("Connect wallet")) return "settled:connect-shown";
    if (document.querySelector(".animate-pulse")) return "still-pulsing";
    return "other";
  });
  if (state !== "still-pulsing") break;
  await new Promise((r) => setTimeout(r, 500));
}
console.log(JSON.stringify({ state, ms: Date.now() - t0 }));
await page.screenshot({ path: "../shots/hungwallet.png" });
await browser.close();
