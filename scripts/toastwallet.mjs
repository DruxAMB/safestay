// Connect-flow toast probe: inject mock EIP-1193, connect, expect
// "Wallet connected" toast + avatar chip; then disconnect → info toast.
import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ACCT = "0x99Ba24f7Aa11bbCCddEEff00112233445566778899".slice(0, 42);
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.evaluateOnNewDocument((acct, chainId) => {
  window.ethereum = {
    request: async ({ method }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [acct];
      if (method === "eth_chainId") return chainId;
      if (method === "wallet_switchEthereumChain") return null;
      return null;
    },
    on: () => {},
    removeListener: () => {},
  };
}, ACCT, "0x" + (7738577).toString(16));

await page.setViewport({ width: 1440, height: 950 });
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 2500)); // silent reconnect lands → toast
const silent = await page.$$eval('[role="status"]', (els) => els.map((e) => e.textContent.trim().slice(0, 70)));
console.log("toasts after silent reconnect:", JSON.stringify(silent));

// explicit disconnect → info toast
await new Promise((r) => setTimeout(r, 2500));
const dcBtn = await page.$('button[aria-label="Disconnect wallet"]');
if (dcBtn) {
  await dcBtn.click();
  await new Promise((r) => setTimeout(r, 600));
  const t = await page.$$eval('[role="status"]', (els) => els.map((e) => e.textContent.trim().slice(0, 70)));
  console.log("toasts after disconnect:", JSON.stringify(t));
} else {
  console.log("no connected chip — silent reconnect did not connect");
}
await page.screenshot({ path: "shot-wallet-toast.png" });
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
