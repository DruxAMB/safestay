// One-off: sign a landlord_profile for the demo landlord (Sunrise PG),
// using its real key from .env.local — a genuine self-signed entity.
import { createWalletClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils";
import { privateKeyToAccount } from "viem/accounts";
import { http } from "viem";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { str, i32, u64 } from "@arkiv-network/sdk/attr";

const ENV = fileURLToPath(new URL("../.env.local", import.meta.url));
const env = Object.fromEntries(
  readFileSync(ENV, "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const key = env.ARKIV_LANDLORD_KEY;
if (!key) throw new Error("ARKIV_LANDLORD_KEY missing");
const account = privateKeyToAccount(key);
const RPC = "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
const wallet = createWalletClient({ chain: tiramisu, transport: http(RPC, { timeout: 15_000 }), account });

// Profiles dedupe client-side by creator, so a single create is fine.
const res = await wallet.createEntity({
  payload: jsonToPayload({ about: "PG accommodation in BTM Layout, Bengaluru." }),
  contentType: "application/json",
  attributes: {
    project: str("safestay_v1"),
    entity_type: str("landlord_profile"),
    schema_version: i32(1),
    created_at: u64(BigInt(Date.now())),
    display_name: str("Sunrise PG"),
    city: str("bengaluru"),
  },
  expires: ExpirationTime.fromDays(730),
  flags: { readonly: true, permissionlessExtension: false },
});
console.log("profile entity:", res.entityKey, "tx:", res.txHash, "by:", account.address);
