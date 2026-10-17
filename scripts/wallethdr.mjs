// Inject a mock EIP-1193 provider so the header renders the CONNECTED
// state — verifies the building pfp + the font-color fix on the chip.
import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 950 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.evaluateOnNewDocument(() => {
  const ACC = "0x99Ba2FA13d396e7cd013aC350eF1fd6d234224f7";
  window.ethereum = {
    request: async ({ method }) => {
      if (method === "eth_accounts" || method === "eth_requestAccounts") return [ACC];
      if (method === "eth_chainId") return "0x" + (7738577).toString(16);
      return null;
    },
    on: () => {},
    removeListener: () => {},
  };
});
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 4500)); // silent-reconnect settles
// Crop the header region — right side where the wallet chip renders.
await page.screenshot({ path: "../shots/wallet-connected.png", clip: { x: 700, y: 0, width: 740, height: 80 } });
console.log(JSON.stringify({ errs: errs.slice(0, 4) }));
await browser.close();
