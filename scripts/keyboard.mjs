// Keyboard-only walk of the demo path. Reports tab order + whether focus lands
// on something visible/labelled at each step.
import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

const steps = [];
for (let i = 0; i < 15; i++) {
  await page.keyboard.press("Tab");
  const f = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const r = el.getBoundingClientRect();
    const label =
      el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 40) || el.getAttribute("href") || "";
    return { tag: el.tagName.toLowerCase(), label, visible: r.width > 0 && r.height > 0 };
  });
  if (!f) break;
  steps.push(`${i + 1}. ${f.tag} "${f.label}" ${f.visible ? "✓" : "✗HIDDEN"}`);
}
console.log("TAB ORDER (home):");
steps.forEach((s) => console.log(" " + s));

// focus ring check: is the focused element's outline actually rendered?
await page.keyboard.press("Tab");
const ring = await page.evaluate(() => {
  const el = document.activeElement;
  const cs = getComputedStyle(el);
  return { outline: cs.outlineStyle + " " + cs.outlineWidth, tag: el.tagName };
});
console.log("FOCUS RING on", ring.tag, "→", ring.outline);
await browser.close();
