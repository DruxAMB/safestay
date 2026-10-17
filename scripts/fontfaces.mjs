// After cache clear: which font faces actually loaded, and which family
// renders the dossier's mono text?
import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 950 });
await page.goto("http://localhost:3001/", { waitUntil: "networkidle0", timeout: 90000 }).catch(() => null);
await new Promise((r) => setTimeout(r, 5000));

const out = await page.evaluate(async () => {
  await document.fonts.ready;
  const faces = [];
  document.fonts.forEach((f) => faces.push(`${f.family} ${f.weight} ${f.status}`));
  const key = [...document.querySelectorAll("p")].find((p) =>
    p.className.includes("text-[11px]"),
  );
  const h1 = document.querySelector("h1");
  return {
    loadedFaces: faces,
    entityKeyFamily: key ? getComputedStyle(key).fontFamily.slice(0, 80) : null,
    h1Family: h1 ? getComputedStyle(h1).fontFamily.slice(0, 80) : null,
  };
});
console.log(JSON.stringify(out, null, 1));
await page.screenshot({ path: "../shots/after-cache-clear.png" });
await browser.close();
