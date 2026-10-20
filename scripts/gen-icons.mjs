// Regenerate every icon asset from the SafeStay mark (src/components/SafeStayMark.tsx).
// Writes: src/app/icon.svg, src/app/favicon.ico (16/32/48 PNG-in-ICO),
// src/app/apple-icon.png (180, opaque), public/icon-512.png (avatar/OG).
// Run: node scripts/gen-icons.mjs   (needs Chrome at the path below)
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Keep in sync with SafeStayMark.tsx — L-block: two tower slabs stepping
// right over a wide base slab, bone panes, one lime accent pane.
const MARK = `
  <rect x="12" y="2.5" width="7" height="5.5" rx="1.2" fill="#0c0a08"/>
  <rect x="12" y="9" width="7" height="5.5" rx="1.2" fill="#0c0a08"/>
  <rect x="5" y="15.5" width="14" height="6" rx="1.4" fill="#0c0a08"/>
  <rect x="13.5" y="4.4" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0"/>
  <rect x="16.1" y="4.4" width="1.8" height="2.2" rx="0.4" fill="#ddf02e"/>
  <rect x="13.5" y="10.9" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0"/>
  <rect x="16.1" y="10.9" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0"/>
  <rect x="7" y="17.4" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0"/>
  <rect x="10" y="17.4" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0"/>
  <rect x="13" y="17.4" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0"/>
  <rect x="16" y="17.4" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0"/>`;

// Bone tile, mark inset ~10% so dark browser chrome can't clip it.
// `radius: 0` → fully square (apple-icon must be opaque to the corners).
function tileSvg(size, radius = 5) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">` +
    `<rect width="24" height="24" rx="${radius}" fill="#f4f2f0"/>` +
    `<g transform="translate(1.2 1.2) scale(0.9)">${MARK}</g></svg>`;
}

async function shot(size, radius) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--disable-gpu"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(`<body style="margin:0">${tileSvg(size, radius)}</body>`);
    return await page.screenshot({ omitBackground: radius > 0 });
  } finally {
    await browser.close();
  }
}

function toIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dirSize = 6 + 16 * pngs.length;
  const dir = Buffer.alloc(dirSize - 6);
  let offset = dirSize;
  pngs.forEach((p, i) => {
    dir.writeUInt8(p.size >= 256 ? 0 : p.size, i * 16);
    dir.writeUInt8(p.size >= 256 ? 0 : p.size, i * 16 + 1);
    dir.writeUInt16LE(1, i * 16 + 4);   // planes
    dir.writeUInt16LE(32, i * 16 + 6);  // bpp
    dir.writeUInt32LE(p.data.length, i * 16 + 8);
    dir.writeUInt32LE(offset, i * 16 + 12);
    offset += p.data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

const pngs = [];
for (const size of [16, 32, 48]) pngs.push({ size, data: await shot(size, 5) });
writeFileSync("src/app/icon.svg", tileSvg(24, 5) + "\n");
writeFileSync("src/app/favicon.ico", toIco(pngs));
writeFileSync("src/app/apple-icon.png", await shot(180, 0));
writeFileSync("public/icon-512.png", await shot(512, 5));
console.log("wrote src/app/icon.svg, src/app/favicon.ico, src/app/apple-icon.png, public/icon-512.png");
