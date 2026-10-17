// Render WalletAvatar for seeded wallets → static HTML → screenshot.
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { WalletAvatar } from "../src/components/WalletAvatar";

const addrs = [
  "0x99Ba2FA13d396e7cd013aC350eF1fd6d234224f7", // Sunrise PG
  "0x28AFA844a91910f947017C08E5E158C551A55D2b", // Sharma
  "0x93D5e7eBE836CbE54dCC10f2A9BE68D5deaa7139", // Lakeview
  "0x5cf8600bbAdEfD56a70381b8e71Eb332d598b2D3", // Skyline
  "0xDB3889D55eB94f65FC604b16005c6Ac420aD467e", // master
];

const cells = addrs
  .map((a) => `<div style="display:inline-flex;align-items:center;gap:8px;margin:10px;padding:8px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;font:12px monospace">${renderToStaticMarkup(<WalletAvatar address={a} size={28} />)} ${a.slice(0, 6)}…${a.slice(-4)}</div>`)
  .join("");

writeFileSync(
  "../shots/avatars.html",
  `<body style="background:#1a1919;padding:24px">${cells}</body>`,
);
console.log("wrote ../shots/avatars.html");
