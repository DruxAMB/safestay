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

/** Synthetic demo counterparties seeded on Tiramisu (see scripts/seed.ts). */
export const SEEDED_LANDLORDS = [
  { name: "Sunrise PG", address: "0x99Ba2FA13d396e7cd013aC350eF1fd6d234224f7", note: "4 tenancies recorded" },
  { name: "Sharma Properties", address: "0x28AFA844a91910f947017C08E5E158C551A55D2b", note: "3 tenancies recorded" },
  { name: "Lakeview Homes", address: "0x93D5e7eBE836CbE54dCC10f2A9BE68D5deaa7139", note: "2 tenancies recorded" },
] as const;

export type EntityType = "deposit_terms" | "deposit_outcome" | "evidence_log";
export type Outcome = "returned_full" | "returned_partial" | "withheld";
export type EvidenceKind = "photo" | "chat" | "doc";

export const OUTCOME_LABEL: Record<Outcome, string> = {
  returned_full: "Returned in full",
  returned_partial: "Returned partially",
  withheld: "Withheld",
};

export function explorerEntityUrl(key: string) {
  return `${EXPLORER}/entity/${key}`;
}
export function explorerTxUrl(tx: string) {
  return `${EXPLORER}/tx/${tx}`;
}
export function explorerAddressUrl(addr: string) {
  return `${EXPLORER}/address/${addr}`;
}
