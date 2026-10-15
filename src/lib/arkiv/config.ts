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
