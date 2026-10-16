/**
 * Browser-side Arkiv: injected wallet (window.ethereum) + public reader.
 * NO "server-only" here — this module is imported by client components and
 * holds no keys. Every write is signed by the user's own wallet in MetaMask
 * (or any EIP-1193 provider) on Tiramisu.
 */
import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils";
import { custom, http, isAddressEqual, type Address, type Hex } from "viem";
import { str } from "@arkiv-network/sdk/attr";
import { CHAIN_ID, PROJECT, TIRAMISU_HTTP, type EvidenceKind, type Outcome } from "./config";
import {
  attrAddr,
  attrKey,
  outcomeAttrs,
  evidenceAttrs,
  profileAttrs,
  termsAttrs,
  type Attrs,
} from "./schema";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
};

export function getProvider(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

/** Connect the injected wallet and put it on Tiramisu (adds the chain if
 *  the wallet doesn't know it). Returns the selected address. */
export async function connectWallet(): Promise<Address> {
  const eth = getProvider();
  if (!eth) throw new Error("No wallet found — install MetaMask or another EIP-1193 wallet.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as Address[];
  const chainHex = `0x${CHAIN_ID.toString(16)}`;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    if (code !== 4902 && !(e as Error)?.message?.includes("Unrecognized chain")) throw e;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: chainHex,
        chainName: "Arkiv Tiramisu",
        rpcUrls: [TIRAMISU_HTTP],
        nativeCurrency: { name: "GLM", symbol: "GLM", decimals: 18 },
        blockExplorerUrls: ["https://tiramisu.explorer.arkiv.network"],
      }],
    });
  }
  return accounts[0];
}

/** Silent reconnect — returns the already-authorized address, or null. */
export async function currentAccount(): Promise<Address | null> {
  const eth = getProvider();
  if (!eth) return null;
  const accounts = (await eth.request({ method: "eth_accounts" })) as Address[];
  return accounts[0] ?? null;
}

/** Arkiv wallet client signing through the injected provider — the user is
 *  the real on-chain creator, not a server-side demo key. */
export function browserSigner(account: Address) {
  const eth = getProvider();
  if (!eth) throw new Error("No wallet provider");
  return createWalletClient({
    account,
    chain: tiramisu,
    transport: custom(eth),
  });
}

export function browserReader() {
  return createPublicClient({
    chain: tiramisu,
    cacheTime: 0,
    transport: http(TIRAMISU_HTTP, { timeout: 8_000 }),
  });
}



/* ---------- client-side writes (mirror lib/arkiv/writes.ts semantics) ---------- */

/** Tenant records outcome + evidence hash in one atomic executeBatch,
 *  signed by the connected wallet. Same linkage rules as the server path:
 *  the referenced terms must name the connected wallet as tenant. */
export async function browserRecordOutcome(input: {
  signer: ReturnType<typeof browserSigner>;
  outcomeId: string;
  termsKey: Hex;
  outcome: Outcome;
  amountReturnedInr: bigint;
  comment: string;
  evidence?: { sha256: Hex; kind: EvidenceKind; filenameHint: string; byteSize: number };
}): Promise<{ entityKey: Hex; evidenceKey: Hex | null; txHash: Hex }> {
  const wallet = input.signer;
  const me = wallet.account!.address;
  const reader = browserReader();

  // Linkage validation — read the terms, confirm they name THIS wallet.
  const terms = await reader.getEntity(input.termsKey);
  const tAttrs = terms.attributes as Attrs;
  const named = attrAddr(tAttrs, "tenant_wallet");
  if (!named || !isAddressEqual(named, me)) {
    throw new Error("These terms name a different tenant — the two-way link won't verify");
  }
  const landlord = terms.creator as Address;

  if (input.evidence) {
    const [pOut, pEvi] = await reader.predictEntityKeys({ owner: me, count: 2 });
    const batch = await wallet.executeBatch({
      creates: [
        {
          salt: pOut.salt,
          payload: jsonToPayload({
            comment: input.comment.slice(0, 280),
            deposit_inr: Number((tAttrs.deposit_inr as { value: unknown } | undefined)?.value ?? 0),
          }),
          contentType: "application/json",
          attributes: outcomeAttrs({
            landlord, termsKey: input.termsKey, outcome: input.outcome,
            amountReturnedInr: input.amountReturnedInr,
            city: (tAttrs.city as { value: unknown } | undefined)?.value as string ?? "",
            outcomeId: input.outcomeId,
          }),
          expires: ExpirationTime.fromDays(730),
          flags: { readonly: true, permissionlessExtension: false },
        },
        {
          salt: pEvi.salt,
          payload: jsonToPayload({
            filename_hint: input.evidence.filenameHint.slice(0, 80),
            byte_size: input.evidence.byteSize,
          }),
          contentType: "application/json",
          attributes: evidenceAttrs({
            outcomeKey: pOut.key, landlord,
            sha256: input.evidence.sha256, kind: input.evidence.kind,
          }),
          expires: ExpirationTime.fromDays(730),
          flags: { readonly: true, permissionlessExtension: false },
        },
      ],
    });
    if (
      batch.createdEntities.length !== 2 ||
      batch.createdEntities[0] !== pOut.key ||
      batch.createdEntities[1] !== pEvi.key
    ) {
      throw new Error(`Batch mismatch after ${batch.txHash} — reconcile before retry`);
    }
    return { entityKey: pOut.key, evidenceKey: pEvi.key, txHash: batch.txHash };
  }

  const res = await wallet.createEntity({
    payload: jsonToPayload({
      comment: input.comment.slice(0, 280),
      deposit_inr: Number((tAttrs.deposit_inr as { value: unknown } | undefined)?.value ?? 0),
    }),
    contentType: "application/json",
    attributes: outcomeAttrs({
      landlord, termsKey: input.termsKey, outcome: input.outcome,
      amountReturnedInr: input.amountReturnedInr,
      city: (tAttrs.city as { value: unknown } | undefined)?.value as string ?? "",
      outcomeId: input.outcomeId,
    }),
    expires: ExpirationTime.fromDays(730),
    flags: { readonly: true, permissionlessExtension: false },
  });
  return { entityKey: res.entityKey, evidenceKey: null, txHash: res.txHash };
}

/** Landlord signs deposit_terms — and optionally their directory profile —
 *  in one batch, from the connected wallet. */
export async function browserSignTerms(input: {
  signer: ReturnType<typeof browserSigner>;
  termsId: string;
  tenant: Address;
  depositInr: bigint;
  city: string;
  propertyLabel: string;
  moveIn: string;
  durationMonths: number;
  note: string;
  profile?: { name: string; city: string };
}): Promise<{ entityKey: Hex; txHash: Hex }> {
  const wallet = input.signer;
  const me = wallet.account!.address;
  const reader = browserReader();

  const termsCreate = {
    payload: jsonToPayload({
      display_label: input.propertyLabel,
      move_in: input.moveIn,
      duration_months: input.durationMonths,
      note: input.note.slice(0, 280),
    }),
    contentType: "application/json" as const,
    attributes: termsAttrs({
      tenant: input.tenant, depositInr: input.depositInr,
      city: input.city, propertyLabel: input.propertyLabel, termsId: input.termsId,
    }),
    expires: ExpirationTime.fromDays(365),
    flags: { readonly: true, permissionlessExtension: false },
  };

  if (input.profile?.name) {
    // Idempotent: skip if this wallet already has a profile entity.
    const existing = await reader
      .select({ key: true })
      .where(eq("project", str(PROJECT)), eq("entity_type", str("landlord_profile")))
      .createdBy(me)
      .limit(1)
      .fetch();
    if (existing.entities.length === 0) {
      const [pTerms, pProf] = await reader.predictEntityKeys({ owner: me, count: 2 });
      const batch = await wallet.executeBatch({
        creates: [
          { salt: pTerms.salt, ...termsCreate },
          {
            salt: pProf.salt,
            payload: jsonToPayload({ about: "" }),
            contentType: "application/json",
            attributes: profileAttrs(input.profile),
            expires: ExpirationTime.fromDays(730),
            flags: { readonly: true, permissionlessExtension: false },
          },
        ],
      });
      if (batch.createdEntities.length !== 2 || batch.createdEntities[0] !== pTerms.key) {
        throw new Error(`Batch mismatch after ${batch.txHash} — reconcile before retry`);
      }
      return { entityKey: pTerms.key, txHash: batch.txHash };
    }
  }

  const res = await wallet.createEntity(termsCreate);
  return { entityKey: res.entityKey, txHash: res.txHash };
}

/** Terms the connected wallet signed (landlord mode) — for the renew view. */
export async function browserMyTerms(me: Address): Promise<
  { key: Hex; tenant: string; depositInr: string; city: string; label: string; expiresAtBlock: string }[]
> {
  const reader = browserReader();
  const page = await reader
    .select({ key: true, attributes: true, expiresAt: true, payload: true })
    .where(
      eq("project", str(PROJECT)),
      eq("entity_type", str("deposit_terms")),
    )
    .createdBy(me)
    .limit(200)
    .fetch();
  return (page.entities as unknown as {
    key: Hex; attributes: Attrs; expiresAt: bigint; toJson?: () => unknown;
  }[]).map((t) => {
    let label = "";
    try {
      const j = t.toJson?.() as { display_label?: string } | undefined;
      label = j?.display_label ?? "";
    } catch { /* optional */ }
    return {
      key: t.key,
      tenant: attrAddr(t.attributes, "tenant_wallet") ?? "",
      depositInr: ((t.attributes.deposit_inr as { value: unknown } | undefined)?.value ?? 0n).toString(),
      city: (t.attributes.city as { value: unknown } | undefined)?.value as string ?? "",
      label,
      expiresAtBlock: t.expiresAt.toString(),
    };
  });
}

/** Lifetime Extension signed by the connected wallet — only the terms'
 *  owner/creator can extend (readonly + permissionlessExtension:false). */
export async function browserExtendTerms(
  signer: ReturnType<typeof browserSigner>,
  termsKey: Hex,
  expiresAtBlock: bigint,
): Promise<{ txHash: Hex }> {
  const res = await signer.extendEntity({
    entityKey: termsKey,
    expires: ExpirationTime.atBlock(expiresAtBlock + BigInt(365 * 43200)),
  });
  return { txHash: res.txHash };
}

/** Client-side read of open terms naming the connected wallet (tenant mode)
 *  or created by it (landlord mode). */
export async function browserOpenTermsFor(tenant: Address): Promise<
  { key: Hex; creator: string; depositInr: string; city: string; label: string; termsKey: Hex }[]
> {
  const reader = browserReader();
  const page = await reader
    .select({ key: true, creator: true, attributes: true, payload: true })
    .where(
      eq("project", str(PROJECT)),
      eq("entity_type", str("deposit_terms")),
    )
    .limit(200)
    .fetch();
  const mine = (page.entities as unknown as {
    key: Hex; creator: string; attributes: Attrs; toJson?: () => unknown;
  }[]).filter((e) => {
    const named = attrAddr(e.attributes, "tenant_wallet");
    return named && isAddressEqual(named, tenant);
  });
  // hide terms already answered by an outcome from this wallet
  const outPage = await reader
    .select({ attributes: true })
    .where(eq("project", str(PROJECT)), eq("entity_type", str("deposit_outcome")))
    .createdBy(tenant)
    .limit(200)
    .fetch();
  const answered = new Set(
    (outPage.entities as unknown as { attributes: Attrs }[])
      .map((e) => attrKey(e.attributes, "terms_key"))
      .filter((k): k is Hex => !!k),
  );
  return mine
    .filter((t) => !answered.has(t.key))
    .map((t) => {
      let label = "";
      try {
        const j = t.toJson?.() as { display_label?: string } | undefined;
        label = j?.display_label ?? "";
      } catch { /* payload optional */ }
      return {
        key: t.key,
        termsKey: t.key,
        creator: t.creator,
        depositInr: (
          (t.attributes.deposit_inr as { value: unknown } | undefined)?.value ?? 0n
        ).toString(),
        city: (t.attributes.city as { value: unknown } | undefined)?.value as string ?? "",
        label,
      };
    });
}
