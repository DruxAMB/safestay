export const PROJECT = "safestay_v1" as const;
export const SCHEMA_VERSION = 1;

export const TIRAMISU_HTTP =
  "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
export const TIRAMISU_WS =
  "wss://rpc.tiramisu.db-chain.testnet.arkiv.network";
export const EXPLORER = "https://tiramisu.explorer.arkiv.network";

export const CHAIN_ID = 7738577;

// Nominal 2s/block on Tiramisu (ExpirationTime helpers use the same estimate).
export const SECONDS_PER_BLOCK = 2;

export type EntityType =
  | "deposit_terms"
  | "deposit_outcome"
  | "evidence_log"
  | "landlord_profile";
export type Outcome = "returned_full" | "returned_partial" | "withheld";
export type EvidenceKind = "photo" | "chat" | "doc";

export const OUTCOME_LABEL: Record<Outcome, string> = {
  returned_full: "Returned in full",
  returned_partial: "Returned partially",
  withheld: "Withheld",
};

/** Seeded demo landlord that gets the high-rise tower model instead of
 *  the mid-rise L-block — Skyline Towers (scripts/add-landlord.mjs). */
export const TOWER_LANDLORD =
  "0x5cf8600bbadefd56a70381b8e71eb332d598b2d3" as const;

/** Seeded demo landlord that gets the stepped terraced model — Lakeview
 *  Homes. */
export const TERRACE_LANDLORD =
  "0x93d5e7ebe836cbe54dcc10f2a9be68d5deaa7139" as const;

/** Static render used for a landlord's chip avatar and the mobile hero
 *  fallback — mirrors the live 3D model each seeded landlord gets. */
export function heroImgFor(addr?: string | null) {
  const a = addr?.toLowerCase();
  if (a === TOWER_LANDLORD) return "/hero-tower.png";
  if (a === TERRACE_LANDLORD) return "/hero-terrace.png";
  return "/hero-building.png";
}

export function explorerEntityUrl(key: string) {
  return `${EXPLORER}/entity/${key}`;
}
export function explorerTxUrl(tx: string) {
  return `${EXPLORER}/tx/${tx}`;
}
export function explorerAddressUrl(addr: string) {
  return `${EXPLORER}/address/${addr}`;
}
