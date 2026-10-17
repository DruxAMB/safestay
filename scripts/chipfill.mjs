import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true, args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => {
  const chips = [...document.querySelectorAll("main button")].filter(
    (b) => b.type === "button" && b.className.includes("rounded-full"));
  if (!chips.length) return false;
  chips[0].click();
  return true;
}, { timeout: 60000, polling: 500 });
await new Promise((r) => setTimeout(r, 400));
const result = await page.evaluate(() => ({
  input: document.querySelector("input")?.value ?? null,
  btn: [...document.querySelectorAll("button")].find((b) => /check history/i.test(b.innerText))?.innerText ?? null,
}));
console.log(JSON.stringify(result));
await browser.close();
