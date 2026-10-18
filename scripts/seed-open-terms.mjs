import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({
  executablePath: CHROME, headless: true, args: ["--disable-gpu"],
});
const p = await b.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:3001/record", { waitUntil: "domcontentloaded", timeout: 90000 });
await new Promise((r) => setTimeout(r, 3000));
await p.click("summary");
await new Promise((r) => setTimeout(r, 6000));

// Fill the demo-landlord terms form — tenant field defaults to the demo
// tenant already; give it a fresh unanswered record for the video's step 3.
await p.evaluate(() => {
  const labels = [...document.querySelectorAll("label")];
  const fill = (match, value) => {
    const lab = labels.find((l) => l.textContent.toLowerCase().includes(match));
    const input = lab?.querySelector("input,textarea,select") ??
      (lab?.htmlFor ? document.getElementById(lab.htmlFor) : null);
    if (!input) return `MISS:${match}`;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return null;
  };
  const misses = [
    fill("property", "btm_pg_bed_10"),
    fill("city", "bengaluru"),
    fill("deposit", "26000"),
    fill("move-in", "2026-10"),
    fill("duration", "11"),
  ].filter(Boolean);
  if (misses.length) console.log("MISS", misses);
});
await new Promise((r) => setTimeout(r, 800));
const clicked = await p.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => /sign.*terms|submit|write/i.test(b.textContent) && !b.disabled,
  );
  if (btn) { btn.click(); return btn.textContent.trim(); }
  return null;
});
console.log("submitted via:", clicked);
// wait for the success toast / entity link
let done = null;
for (let i = 0; i < 40; i++) {
  done = await p.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((a) =>
      a.href.includes("tiramisu.explorer.arkiv.network/entity/"));
    const toast = document.querySelector('[class*="toast"], [role="status"]');
    return {
      entityLink: a?.href?.split("/entity/")[1]?.slice(0, 18) ?? null,
      toastText: toast?.textContent?.slice(0, 80) ?? null,
    };
  });
  if (done.entityLink) break;
  await new Promise((r) => setTimeout(r, 500));
}
console.log("result:", JSON.stringify(done));
console.log("errors:", errs.length ? errs : "none");
await b.close();
