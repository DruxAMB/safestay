import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true, args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.evaluateOnNewDocument(() => {
  const announce = (uuid, name) => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
    detail: { info: { uuid, name, icon: "" },
      provider: { request: () => Promise.resolve([]), on: () => {}, removeListener: () => {} } },
  }));
  window.__a = announce;
});
await page.goto("http://localhost:3001/record", { waitUntil: "domcontentloaded" });
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => { window.__a("w1", "HealthyWallet"); window.__a("w2", "DeadWallet"); });
  await new Promise((r) => setTimeout(r, 400));
}
await page.waitForFunction(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.innerText.includes("Connect wallet to sign"));
  if (!b) return false; b.click(); return true;
}, { timeout: 20000, polling: 300 });
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: "../shots/picker-modal.png" });
await browser.close();
console.log("done");
