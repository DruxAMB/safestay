import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true, args: ["--no-sandbox", "--disable-gpu"],
});
const p = await browser.newPage();
await p.setJavaScriptEnabled(false);
await p.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await new Promise(r => setTimeout(r, 1000));
const res = await p.evaluate(() => {
  const h1 = document.querySelector('h1');
  const cs = getComputedStyle(h1);
  return { text: h1?.textContent?.slice(0, 30), visibility: cs.visibility, opacity: cs.opacity };
});
console.log('no-JS hero:', JSON.stringify(res));
await browser.close();
