// Font-size ground truth: computed px vs class-intended px for the hero's
// mono micro-labels + input, plus root rem and any CSS zoom/scale ancestor.
import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 950 });
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 4000));

const out = await page.evaluate(() => {
  const res = { rootRem: getComputedStyle(document.documentElement).fontSize };
  // entity key paragraph
  const key = [...document.querySelectorAll("p")].find((p) =>
    p.className.includes("text-[11px]"),
  );
  if (key) res.entityKey = { cls: "text-[11px]", computed: getComputedStyle(key).fontSize };
  // annotation li
  const li = [...document.querySelectorAll("li")].find((l) =>
    l.className.includes("text-[10px]"),
  );
  if (li) res.annotation = { cls: "text-[10px]", computed: getComputedStyle(li).fontSize };
  // input
  const inp = document.querySelector("input");
  if (inp) res.input = { cls: "text-base", computed: getComputedStyle(inp).fontSize };
  // mono micro-labels
  const lab = [...document.querySelectorAll("p")].find((p) =>
    p.className.includes("text-[10px]"),
  );
  if (lab) res.microLabel = { cls: "text-[10px]", computed: getComputedStyle(lab).fontSize };
  // any zoom/scale ancestor on the specimen card?
  let el = key;
  const zoomers = [];
  while (el) {
    const cs = getComputedStyle(el);
    if (cs.zoom !== "1" && cs.zoom !== "normal") zoomers.push({ tag: el.tagName, zoom: cs.zoom });
    if (cs.transform !== "none") zoomers.push({ tag: el.tagName, transform: cs.transform.slice(0, 60) });
    el = el.parentElement;
  }
  res.zoomOrTransformAncestors = zoomers;
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
