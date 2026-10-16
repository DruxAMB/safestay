// Simulates TWO wallets announcing via EIP-6963 (one healthy, one dead —
// the user's actual machine state) and checks the picker renders.
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

await page.evaluateOnNewDocument(() => {
  const announce = (uuid, name, dead) => {
    const provider = {
      request: dead ? () => new Promise(() => {}) : () => Promise.resolve([]),
      on: () => {}, removeListener: () => {},
    };
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
      detail: { info: { uuid, name, icon: "data:," }, provider },
    }));
  };
  window.__announce = announce;
  window.ethereum = { request: () => Promise.resolve([]), on: () => {} }; // default provider exists too
});

await page.goto("http://localhost:3001/record", { waitUntil: "domcontentloaded" });
// announce after our listener mounts
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => {
  window.__announce("w-healthy", "HealthyWallet", false);
  window.__announce("w-dead", "DeadWallet", true);
});
await new Promise((r) => setTimeout(r, 3500)); // let ready flip

const result = await page.evaluate(() => {
  const sel = document.querySelector("#wallet-pick");
  return {
    picker: sel ? [...sel.options].map((o) => o.textContent) : null,
    connectBtn: document.body.innerText.includes("Connect wallet to sign"),
    stillPulsing: !!document.querySelector(".animate-pulse[aria-hidden]"),
  };
});
console.log(JSON.stringify(result, null, 1));
await page.screenshot({ path: "../shots/walletpick.png" });
await browser.close();
