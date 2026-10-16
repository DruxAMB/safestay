import "server-only";
import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { http, webSocket, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { TIRAMISU_HTTP, TIRAMISU_WS } from "./config";

export type ArkivReader = ReturnType<typeof createReader>;

/** Public read client — no wallet, no key. Judges' path.
 *  cacheTime:0 + no-store per arkiv-app-integration guidance.
 *  retryCount: the public RPC anonymous-cost-limits bursts (HTTP 429
 *  ANON_COST_LIMITED) — viem retries 429 natively. batch: Tiramisu accepts
 *  JSON-RPC batches, so concurrent reads coalesce into one request. */
export function createReader() {
  return createPublicClient({
    chain: tiramisu,
    cacheTime: 0,
    transport: http(TIRAMISU_HTTP, {
      timeout: 8_000,
      retryCount: 4,
      retryDelay: 600,
      batch: { batchSize: 32, wait: 20 },
      fetchOptions: { cache: "no-store", redirect: "error" },
    }),
  });
}

/** WebSocket reader for live-event watching (server-side). */
export function createWsReader() {
  return createPublicClient({
    chain: tiramisu,
    transport: webSocket(TIRAMISU_WS),
  });
}

function keyFromEnv(name: string): `0x${string}` {
  const k = process.env[name];
  if (!k || !/^0x[0-9a-fA-F]{64}$/.test(k)) {
    throw new Error(`${name} is missing or malformed (server env)`);
  }
  return k as `0x${string}`;
}

/** Server-side signer for the demo-tenant role (records outcomes). */
export function tenantWallet() {
  return createWalletClient({
    chain: tiramisu,
    transport: http(TIRAMISU_HTTP, {
      timeout: 15_000,
      retryCount: 4,
      retryDelay: 600,
      batch: { batchSize: 32, wait: 20 },
    }),
    account: privateKeyToAccount(keyFromEnv("ARKIV_TENANT_KEY")),
  });
}

/** Server-side signer for the demo-landlord role (signs terms). */
export function landlordWallet() {
  return createWalletClient({
    chain: tiramisu,
    transport: http(TIRAMISU_HTTP, {
      timeout: 15_000,
      retryCount: 4,
      retryDelay: 600,
      batch: { batchSize: 32, wait: 20 },
    }),
    account: privateKeyToAccount(keyFromEnv("ARKIV_LANDLORD_KEY")),
  });
}

export function walletAddress(role: "tenant" | "landlord"): Address {
  const key = keyFromEnv(
    role === "tenant" ? "ARKIV_TENANT_KEY" : "ARKIV_LANDLORD_KEY",
  );
  return privateKeyToAccount(key).address;
}
