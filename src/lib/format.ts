import { SECONDS_PER_BLOCK } from "@/lib/arkiv/config";

export function inr(n: bigint | string | number): string {
  const v = BigInt(n);
  if (v >= 100000n) return `₹${(Number(v) / 100000).toFixed(1)}L`;
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

export function shortAddr(a: string, head = 6, tail = 4): string {
  return a.length > head + tail + 2 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a;
}
export function shortKey(k: string): string {
  return k.length > 14 ? `${k.slice(0, 8)}…${k.slice(-6)}` : k;
}

/** "2026-10-17" — ISO date from a millisecond timestamp string. */
export function fmtDate(ms: string): string {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Date(n).toISOString().slice(0, 10);
}

/** Remaining life from an expiry block against a snapshot block. */
export function blocksLeft(expiresAtBlock: string, snapshotBlock: string): bigint {
  const left = BigInt(expiresAtBlock) - BigInt(snapshotBlock);
  return left > 0n ? left : 0n;
}

export function expiryText(expiresAtBlock: string, snapshotBlock: string): string {
  const left = blocksLeft(expiresAtBlock, snapshotBlock);
  const days = Number(left) * SECONDS_PER_BLOCK / 86400;
  if (days < 1) return "expires within a day";
  if (days < 60) return `expires in ~${Math.round(days)} days`;
  const months = Math.round(days / 30);
  return `expires in ~${months} months (block ${expiresAtBlock})`;
}
