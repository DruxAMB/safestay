/**
 * SafeStay seed — creates the demo world on Tiramisu.
 *
 * 7 burners: 3 landlords, 3 tenants, 1 demo tenant. The funded master
 * wallet (ARKIV_SEED_KEY) sends each ~0.3 GLM, then each wallet signs its
 * own entities — creator provenance is the whole product, so seed records
 * are real on-chain signatures, not fixtures.
 *
 * Run:  npm run seed
 * Out:  .env.local gains ARKIV_TENANT_KEY / ARKIV_LANDLORD_KEY;
 *       scripts/seed-results.json (gitignored) holds addresses + keys.
 */
import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils";
import { http, parseEther, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { termsAttrs, outcomeAttrs, evidenceAttrs } from "../src/lib/arkiv/schema";
import { PROJECT } from "../src/lib/arkiv/config";

const RPC = "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
const OUT = fileURLToPath(new URL("./seed-results.json", import.meta.url));
const ENV = fileURLToPath(new URL("../.env.local", import.meta.url));

const log = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// tsx doesn't auto-load .env.local — parse it manually (no dotenv dep).
const envFile = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const envMap = Object.fromEntries(
  envFile.split(/\r?\n/).filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const masterKey = (envMap.ARKIV_SEED_KEY ?? process.env.ARKIV_SEED_KEY) as `0x${string}`;
if (!masterKey) throw new Error("ARKIV_SEED_KEY missing — put the funded burner key in .env.local");
const master = privateKeyToAccount(masterKey);

const reader = createPublicClient({ chain: tiramisu, transport: http(RPC, { timeout: 10_000 }) });
const masterWallet = createWalletClient({ chain: tiramisu, transport: http(RPC, { timeout: 15_000 }), account: master });

const wallet = (key: `0x${string}`) =>
  createWalletClient({ chain: tiramisu, transport: http(RPC, { timeout: 15_000 }), account: privateKeyToAccount(key) });

async function fund(to: Address, eth = "0.3") {
  const hash = await masterWallet.sendTransaction({ to, value: parseEther(eth), chain: tiramisu });
  await reader.waitForTransactionReceipt({ hash });
  log(`  funded ${to.slice(0, 10)}… (${eth} GLM) tx=${hash.slice(0, 12)}…`);
}

type Actor = { name: string; key: `0x${string}`; address: Address };
const mk = (name: string): Actor => {
  const key = generatePrivateKey();
  return { name, key, address: privateKeyToAccount(key).address };
};

const fakeHash = (n: number): Hex =>
  `0x${n.toString(16).padStart(64, "0")}` as Hex;

async function main() {
  log(`master: ${master.address}`);
  const bal = await reader.getBalance({ address: master.address });
  log(`master balance: ${Number(bal) / 1e18} GLM`);

  // Reuse an existing seed if present — re-running must not double-write.
  if (existsSync(OUT)) {
    const prev = JSON.parse(readFileSync(OUT, "utf8"));
    log(`seed already ran (${prev.createdAt}) — see scripts/seed-results.json. Delete it to reseed.`);
    return;
  }

  const landlords = [mk("Sharma Properties"), mk("Sunrise PG"), mk("Lakeview Homes")];
  const tenants = [mk("tenant_aarav"), mk("tenant_diya"), mk("tenant_rohan")];
  const demoTenant = mk("demo_tenant");
  const all = [...landlords, ...tenants, demoTenant];

  log("generating 7 burners and funding from master…");
  for (const a of all) await fund(a.address, "0.3");
  await sleep(2000);

  type Plan = {
    landlord: number; tenant: number | "demo"; city: string; label: string;
    deposit: bigint; outcome?: "returned_full" | "returned_partial" | "withheld";
    returned?: bigint; comment?: string; open?: boolean;
  };
  const plans: Plan[] = [
    // Sharma Properties — mostly honest (Bengaluru)
    { landlord: 0, tenant: 0, city: "bengaluru", label: "hsr_2bhk_a", deposit: 60000n, outcome: "returned_full", returned: 60000n, comment: "Full refund after 14 months, minor cleaning charge waived." },
    { landlord: 0, tenant: 1, city: "bengaluru", label: "hsr_2bhk_b", deposit: 55000n, outcome: "returned_full", returned: 55000n, comment: "Returned in full within 10 days of vacating." },
    { landlord: 0, tenant: 2, city: "bengaluru", label: "koramangala_studio", deposit: 45000n, outcome: "returned_partial", returned: 38000n, comment: "₹7k held for wall repainting — receipt shared." },
    // Sunrise PG — the withholding landlord (the demo's money shot)
    { landlord: 1, tenant: 0, city: "bengaluru", label: "btm_pg_bed_4", deposit: 25000n, outcome: "withheld", returned: 0n, comment: "Advance kept citing 'notice period', despite 45 days notice given." },
    { landlord: 1, tenant: 1, city: "bengaluru", label: "btm_pg_bed_7", deposit: 30000n, outcome: "returned_partial", returned: 9000n, comment: "₹21k deducted for 'deep cleaning + repairs' with no bills." },
    { landlord: 1, tenant: 2, city: "bengaluru", label: "btm_pg_bed_2", deposit: 25000n, outcome: "returned_partial", returned: 10000n, comment: "15 months, returned ₹10k of ₹25k after 3 months of chasing." },
    // Lakeview Homes — clean record (Mumbai)
    { landlord: 2, tenant: 0, city: "mumbai", label: "powai_1bhk_c", deposit: 80000n, outcome: "returned_full", returned: 80000n, comment: "Full return, same-day transfer on handover." },
    { landlord: 2, tenant: 1, city: "mumbai", label: "powai_1bhk_d", deposit: 75000n, outcome: "returned_full", returned: 75000n, comment: "Deposit returned before vacating. Model landlord." },
    // Sunrise PG — OPEN terms naming the demo tenant (live record for demo step 3)
    { landlord: 1, tenant: "demo", city: "bengaluru", label: "btm_pg_bed_9", deposit: 28000n, open: true },
  ];

  const results: Record<string, unknown> = {
    createdAt: new Date().toISOString(),
    project: PROJECT,
    landlords: landlords.map((l) => ({ name: l.name, address: l.address })),
    tenants: tenants.map((t) => ({ name: t.name, address: t.address })),
    demoTenant: demoTenant.address,
    demoLandlord: landlords[1].address,
    entities: [] as { key: string; type: string; tx: string }[],
  };

  for (const [i, p] of plans.entries()) {
    const L = landlords[p.landlord];
    const T = p.tenant === "demo" ? demoTenant : tenants[p.tenant];
    const lw = wallet(L.key);
    const termsId = `seed_terms_${i}`;
    log(`terms ${i + 1}/${plans.length}: ${L.name} → ${T.name} (${p.label}, ₹${p.deposit})`);
    const terms = await lw.createEntity({
      payload: jsonToPayload({
        display_label: p.label,
        move_in: "2025-07",
        duration_months: 12,
        note: "12-month lock-in, refundable deposit.",
      }),
      contentType: "application/json",
      attributes: termsAttrs({
        tenant: T.address, depositInr: p.deposit, city: p.city,
        propertyLabel: p.label, termsId,
      }),
      expires: ExpirationTime.fromDays(365),
      flags: { readonly: true, permissionlessExtension: false },
    });
    (results.entities as { key: string; type: string; tx: string }[]).push(
      { key: terms.entityKey, type: "deposit_terms", tx: terms.txHash });
    log(`  ✓ ${terms.entityKey.slice(0, 14)}… tx=${terms.txHash.slice(0, 12)}…`);

    if (!p.outcome) continue; // the open one stays open for the live demo
    await sleep(500);

    // Tenant answers: outcome + evidence, atomically via predict+executeBatch.
    const tw = wallet(T.key);
    const outcomeId = `seed_outcome_${i}`;
    const [pOut, pEvi] = await reader.predictEntityKeys({ owner: T.address, count: 2 });
    log(`outcome ${i + 1}: ${T.name} → ${p.outcome} ₹${p.returned} (batch w/ evidence)`);
    const batch = await tw.executeBatch({
      creates: [
        {
          salt: pOut.salt,
          payload: jsonToPayload({ comment: p.comment, deposit_inr: Number(p.deposit) }),
          contentType: "application/json",
          attributes: outcomeAttrs({
            landlord: L.address, termsKey: terms.entityKey,
            outcome: p.outcome, amountReturnedInr: p.returned!,
            city: p.city, outcomeId,
          }),
          expires: ExpirationTime.fromDays(730),
          flags: { readonly: true, permissionlessExtension: false },
        },
        {
          salt: pEvi.salt,
          payload: jsonToPayload({ filename_hint: `moveout_${p.label}.jpg`, byte_size: 184320 }),
          contentType: "application/json",
          attributes: evidenceAttrs({
            outcomeKey: pOut.key, landlord: L.address,
            sha256: fakeHash(0xa11ce + i), kind: "photo",
          }),
          expires: ExpirationTime.fromDays(730),
          flags: { readonly: true, permissionlessExtension: false },
        },
      ],
    });
    if (batch.createdEntities[0] !== pOut.key || batch.createdEntities[1] !== pEvi.key)
      throw new Error(`seed batch mismatch at ${i}: ${batch.txHash}`);
    (results.entities as { key: string; type: string; tx: string }[]).push(
      { key: pOut.key, type: "deposit_outcome", tx: batch.txHash },
      { key: pEvi.key, type: "evidence_log", tx: batch.txHash });
    log(`  ✓ outcome ${pOut.key.slice(0, 14)}… + evidence (1 tx)`);
    await sleep(500);
  }

  // Persist results + write the app signers into .env.local.
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  const envAdd =
    `\nARKIV_TENANT_KEY=${demoTenant.key}\nARKIV_LANDLORD_KEY=${landlords[1].key}\n`;
  const cur = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
  writeFileSync(ENV, cur.replace(/\n?ARKIV_TENANT_KEY=.*|ARKIV_LANDLORD_KEY=.*/g, "") + envAdd);

  log("—".repeat(30));
  log(`SEEDED. demo landlord (Sunrise PG): ${landlords[1].address}`);
  log(`demo tenant: ${demoTenant.address}`);
  log(`entities: ${(results.entities as unknown[]).length}`);
  log("keys written to .env.local; full results in scripts/seed-results.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
