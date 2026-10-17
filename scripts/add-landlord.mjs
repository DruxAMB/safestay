// Adds a 4th landlord to the live directory: Skyline Towers (Hyderabad).
// All real signatures — a fresh landlord burner signs its profile + terms,
// two fresh tenant burners answer with outcomes + evidence. Funded by
// ARKIV_SEED_KEY. Keys persist to scripts/seed-results-extra.json
// (git-excluded) so future scripts can reuse them.
//
// Run: node scripts/add-landlord.mjs
import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils";
import { str, i32, u64, u256, addr, key as keyAttr } from "@arkiv-network/sdk/attr";
import { http, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ENV = fileURLToPath(new URL("../.env.local", import.meta.url));
const OUT = fileURLToPath(new URL("./seed-results-extra.json", import.meta.url));
const RPC = "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const env = Object.fromEntries(
  readFileSync(ENV, "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const masterKey = env.ARKIV_SEED_KEY;
if (!masterKey) throw new Error("ARKIV_SEED_KEY missing from .env.local");
const master = privateKeyToAccount(masterKey.startsWith("0x") ? masterKey : `0x${masterKey}`);

const reader = createPublicClient({ chain: tiramisu, transport: http(RPC, { timeout: 10_000 }) });
const masterWallet = createWalletClient({ chain: tiramisu, transport: http(RPC, { timeout: 15_000 }), account: master });
const wallet = (key) =>
  createWalletClient({ chain: tiramisu, transport: http(RPC, { timeout: 15_000 }), account: privateKeyToAccount(key) });
const mk = (name) => {
  const k = generatePrivateKey();
  return { name, key: k, address: privateKeyToAccount(k).address };
};
const fund = async (to, eth = "0.3") => {
  const hash = await masterWallet.sendTransaction({ to, value: parseEther(eth), chain: tiramisu });
  await reader.waitForTransactionReceipt({ hash });
  log(`  funded ${to.slice(0, 10)}… (${eth} GLM)`);
};
const fakeHash = (n) => `0x${n.toString(16).padStart(64, "0")}`;

if (existsSync(OUT)) {
  log("add-landlord already ran — see scripts/seed-results-extra.json. Delete it to re-run.");
  process.exit(0);
}

const landlord = mk("Skyline Towers");
const tenants = [mk("tenant_priya"), mk("tenant_arjun")];
log(`master: ${master.address}`);
log(`funding landlord + 2 tenants…`);
for (const a of [landlord, ...tenants]) await fund(a.address);
await sleep(2000);

const results = {
  createdAt: new Date().toISOString(),
  landlord: { name: landlord.name, address: landlord.address, key: landlord.key },
  tenants: tenants.map((t) => ({ name: t.name, address: t.address, key: t.key })),
  entities: [],
};

const common = (t) => ({
  project: str("safestay_v1"), entity_type: str(t), schema_version: i32(1),
  created_at: u64(BigInt(Date.now())),
});
const lw = wallet(landlord.key);

// Self-signed profile — only this wallet can name "Skyline Towers".
log("signing landlord_profile…");
const prof = await lw.createEntity({
  payload: jsonToPayload({ about: "Serviced apartments in a Gachibowli high-rise, Hyderabad." }),
  contentType: "application/json",
  attributes: {
    ...common("landlord_profile"),
    display_name: str("Skyline Towers"),
    city: str("hyderabad"),
  },
  expires: ExpirationTime.fromDays(730),
  flags: { readonly: true, permissionlessExtension: false },
});
results.entities.push({ key: prof.entityKey, type: "landlord_profile", tx: prof.txHash });
log(`  ✓ profile ${prof.entityKey.slice(0, 14)}…`);

// 3 terms: two get answered (full + partial), one stays open.
const plans = [
  { t: 0, label: "gachibowli_tower_1204", deposit: 110000n, outcome: "returned_full", returned: 110000n,
    comment: "Corporate lease exit — full deposit wired on handover day." },
  { t: 1, label: "gachibowli_tower_807", deposit: 95000n, outcome: "returned_partial", returned: 72000n,
    comment: "₹23k held for repainting and appliance repair; bills attached." },
  { t: 0, label: "gachibowli_tower_1502", deposit: 85000n, open: true },
];

for (const [i, p] of plans.entries()) {
  const T = tenants[p.t];
  log(`terms ${i + 1}/${plans.length}: ${landlord.name} → ${T.name} (${p.label}, ₹${p.deposit})`);
  const terms = await lw.createEntity({
    payload: jsonToPayload({
      display_label: p.label, move_in: "2025-08", duration_months: 11,
      note: "11-month lease, refundable deposit.",
    }),
    contentType: "application/json",
    attributes: {
      ...common("deposit_terms"),
      city: str("hyderabad"),
      tenant_wallet: addr(T.address),
      deposit_inr: u256(p.deposit),
      property_label: str(p.label),
      terms_id: str(`seed2_terms_${i}`),
    },
    expires: ExpirationTime.fromDays(365),
    flags: { readonly: true, permissionlessExtension: false },
  });
  results.entities.push({ key: terms.entityKey, type: "deposit_terms", tx: terms.txHash });
  log(`  ✓ terms ${terms.entityKey.slice(0, 14)}…`);
  if (!p.outcome) continue;
  await sleep(500);

  // Tenant answers: outcome + evidence atomically.
  const tw = wallet(T.key);
  const [pOut, pEvi] = await reader.predictEntityKeys({ owner: T.address, count: 2 });
  const batch = await tw.executeBatch({
    creates: [
      {
        salt: pOut.salt,
        payload: jsonToPayload({ comment: p.comment, deposit_inr: Number(p.deposit) }),
        contentType: "application/json",
        attributes: {
          ...common("deposit_outcome"),
          city: str("hyderabad"),
          landlord_wallet: addr(landlord.address),
          terms_key: keyAttr(terms.entityKey),
          outcome: str(p.outcome),
          amount_returned_inr: u256(p.returned),
          outcome_id: str(`seed2_outcome_${i}`),
        },
        expires: ExpirationTime.fromDays(730),
        flags: { readonly: true, permissionlessExtension: false },
      },
      {
        salt: pEvi.salt,
        payload: jsonToPayload({ filename_hint: `moveout_${p.label}.jpg`, byte_size: 204800 }),
        contentType: "application/json",
        attributes: {
          ...common("evidence_log"),
          outcome_key: keyAttr(pOut.key),
          landlord_wallet: addr(landlord.address),
          evidence_sha256: fakeHash(0xbeef + i),
          evidence_kind: str("photo"),
        },
        expires: ExpirationTime.fromDays(730),
        flags: { readonly: true, permissionlessExtension: false },
      },
    ],
  });
  if (batch.createdEntities[0] !== pOut.key || batch.createdEntities[1] !== pEvi.key)
    throw new Error(`batch mismatch at ${i}: ${batch.txHash}`);
  results.entities.push(
    { key: pOut.key, type: "deposit_outcome", tx: batch.txHash },
    { key: pEvi.key, type: "evidence_log", tx: batch.txHash });
  log(`  ✓ outcome ${pOut.key.slice(0, 14)}… + evidence`);
  await sleep(500);
}

writeFileSync(OUT, JSON.stringify(results, null, 2));
log("—".repeat(30));
log(`DONE. ${landlord.name}: ${landlord.address}`);
log(`entities written: ${results.entities.length} (keys in seed-results-extra.json)`);
