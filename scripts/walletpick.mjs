// Simulates TWO wallets announcing via EIP-6963 (one healthy, one dead —
// the user's actual machine state), opens the picker modal, clicks the
// healthy wallet, verifies the connect lands.
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 200)); });

await page.evaluateOnNewDocument(() => {
  window.__announce = (uuid, name, dead) => {
    const provider = {
      request: dead
        ? () => new Promise(() => {}) // hangs forever
        : (a) => a.method === "eth_requestAccounts" || a.method === "eth_accounts"
            ? Promise.resolve(["0x000000000000000000000000000000000000dEaD"])
            : a.method === "eth_chainId" ? Promise.resolve("0x7614d1") : Promise.resolve([]),
      on: () => {}, removeListener: () => {},
    };
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
      detail: { info: { uuid, name, icon: "" }, provider },
    }));
  };
});

await page.goto("http://localhost:3001/record", { waitUntil: "domcontentloaded" });
// announce repeatedly — our listener attaches on hydration, timing varies
for (let i = 0; i < 8; i++) {
  await page.evaluate(() => {
    window.__announce("w-dead", "DeadWallet", true);
    window.__announce("w-healthy", "HealthyWallet", false);
  });
  await new Promise((r) => setTimeout(r, 500));
}

// open the picker — wait for hydration (client components mount async)
const opened = await page.waitForFunction(
  () => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.innerText.includes("Connect wallet to sign")
    );
    if (!btn) return false;
    btn.click();
    return true;
  },
  { timeout: 20000, polling: 300 },
).then(() => true).catch(() => false);
await new Promise((r) => setTimeout(r, 600));

const picker = await page.evaluate(() => {
  const dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return null;
  return [...dlg.querySelectorAll("button")].map((b) => b.innerText.trim()).filter(Boolean);
});

// click HealthyWallet
const clicked = await page.evaluate(() => {
  const dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return false;
  const btn = [...dlg.querySelectorAll("button")].find((b) => b.innerText.includes("HealthyWallet"));
  if (!btn) return false;
  btn.click();
  return true;
});
await new Promise((r) => setTimeout(r, 2000));

const after = await page.evaluate(() => ({
  modalGone: !document.querySelector('[role="dialog"]'),
  connected: document.body.innerText.includes("signed in:"),
}));
console.log(JSON.stringify({ opened, picker, clicked, after }, null, 1));
await page.screenshot({ path: "../shots/walletpick.png" });
await browser.close();
