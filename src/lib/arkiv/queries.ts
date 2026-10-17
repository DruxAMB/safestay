import "server-only";
import { eq, type Expression } from "@arkiv-network/sdk/query";
import { addr, key, str } from "@arkiv-network/sdk/attr";
import { isAddressEqual, type Address, type Hex } from "viem";
import { PROJECT, type Outcome, type EvidenceKind } from "./config";
import { createReader, type ArkivReader } from "./clients";
import {
  attrAddr,
  attrBig,
  attrKey,
  attrStr,
  type Attrs,
  type EvidenceDto,
  type LandlordHistory,
  type OutcomeDto,
  type ProfileDto,
  type TermsDto,
} from "./schema";

type Entity = {
  key: Hex;
  owner: Hex;
  creator: Hex;
  expiresAt: bigint;
  attributes: Attrs;
  toJson: () => unknown;
};

const MAX_PAGES = 10; // app policy: 200/page × 10 = up to 2,000 records per scope

async function walk(
  reader: ArkivReader,
  predicates: Expression[],
  creator?: Address,
  snapshot?: bigint,
) {
  // Shared snapshot when the caller queries related sets — one block pin per
  // logical read, so paired results are consistent AND the RPC gets hit once
  // (the public endpoint anonymous-cost-limits bursts).
  const at = snapshot ?? (await reader.getBlockNumber({ cacheTime: 0 }));
  let sel = reader
    .select({
      key: true,
      owner: true,
      creator: true,
      expiresAt: true,
      attributes: true,
      payload: true,
    })
    .where(...predicates)
    .atBlock(at)
    .limit(200);
  if (creator) sel = sel.createdBy(creator);
  let page = await sel.fetch();
  if (page.blockNumber !== at) throw new Error("Query snapshot mismatch");
  const entities = [...page.entities] as unknown as Entity[];
  let pages = 1;
  while (page.hasNextPage()) {
    if (pages >= MAX_PAGES) throw new Error("Query page budget exhausted");
    page = await page.next();
    if (page.blockNumber !== at) throw new Error("Query snapshot mismatch");
    pages++;
    entities.push(...(page.entities as unknown as Entity[]));
  }
  return { snapshot: at, entities };
}

function jsonPayload(e: Entity): Record<string, unknown> {
  try {
    const j = e.toJson();
    return j && typeof j === "object" ? (j as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toOutcomeDto(e: Entity, verified: boolean, termsMissing: boolean): OutcomeDto {
  const p = jsonPayload(e);
  return {
    entityKey: e.key,
    creator: e.creator,
    landlord: attrAddr(e.attributes, "landlord_wallet") ?? "",
    termsKey: attrKey(e.attributes, "terms_key") ?? null,
    outcome: (attrStr(e.attributes, "outcome") ?? "withheld") as Outcome,
    amountReturnedInr: (attrBig(e.attributes, "amount_returned_inr") ?? 0n).toString(),
    city: attrStr(e.attributes, "city") ?? "",
    createdAtMs: (attrBig(e.attributes, "created_at") ?? 0n).toString(),
    expiresAtBlock: e.expiresAt.toString(),
    comment: typeof p.comment === "string" ? p.comment : "",
    depositInr: typeof p.deposit_inr === "number" ? String(p.deposit_inr) : "0",
    verified,
    termsMissing,
  };
}

function toTermsDto(e: Entity): TermsDto {
  const p = jsonPayload(e);
  return {
    entityKey: e.key,
    creator: e.creator,
    tenant: attrAddr(e.attributes, "tenant_wallet") ?? "",
    depositInr: (attrBig(e.attributes, "deposit_inr") ?? 0n).toString(),
    city: attrStr(e.attributes, "city") ?? "",
    propertyLabel: attrStr(e.attributes, "property_label") ?? "",
    createdAtMs: (attrBig(e.attributes, "created_at") ?? 0n).toString(),
    expiresAtBlock: e.expiresAt.toString(),
    displayLabel: typeof p.display_label === "string" ? p.display_label : "",
  };
}

function toEvidenceDto(e: Entity): EvidenceDto {
  const p = jsonPayload(e);
  return {
    entityKey: e.key,
    outcomeKey: attrKey(e.attributes, "outcome_key") ?? "",
    sha256: attrKey(e.attributes, "evidence_sha256") ?? "",
    kind: (attrStr(e.attributes, "evidence_kind") ?? "photo") as EvidenceKind,
    filenameHint: typeof p.filename_hint === "string" ? p.filename_hint : "",
  };
}

/** The money shot: every outcome ever recorded about a landlord, with
 *  two-way-link verification against the landlord-signed terms entity.
 *  Outcomes are open-scope by design — any tenant may review; trust is
 *  proven by the linked terms naming them back, not an allowlist. */
export async function getLandlordHistory(landlord: Address): Promise<LandlordHistory> {
  const reader = createReader();
  const snapshot = await reader.getBlockNumber({ cacheTime: 0 });
  const [outcomesRes, termsRes] = await Promise.all([
    walk(reader, [
      eq("project", str(PROJECT)),
      eq("entity_type", str("deposit_outcome")),
      eq("landlord_wallet", addr(landlord)),
    ], undefined, snapshot),
    walk(
      reader,
      [eq("project", str(PROJECT)), eq("entity_type", str("deposit_terms"))],
      landlord,
      snapshot,
    ),
  ]);

  const termsByKey = new Map(termsRes.entities.map((t) => [t.key, t]));
  const outcomes = outcomesRes.entities.map((o) => {
    const tk = attrKey(o.attributes, "terms_key");
    const terms = tk ? termsByKey.get(tk) : undefined;
    const namedTenant = terms && attrAddr(terms.attributes, "tenant_wallet");
    const verified =
      !!terms && !!namedTenant && isAddressEqual(namedTenant, o.creator as Address);
    return toOutcomeDto(o, verified, !!tk && !terms);
  });

  let promised = 0n, returned = 0n;
  let full = 0, partial = 0, withheld = 0, verified = 0;
  for (const o of outcomes) {
    promised += BigInt(o.depositInr);
    returned += BigInt(o.amountReturnedInr);
    if (o.outcome === "returned_full") full++;
    else if (o.outcome === "returned_partial") partial++;
    else withheld++;
    if (o.verified) verified++;
  }

  return {
    landlord,
    outcomes,
    terms: termsRes.entities.map(toTermsDto),
    totals: {
      promisedInr: promised.toString(),
      returnedInr: returned.toString(),
      count: outcomes.length,
      full, partial, withheld, verified,
    },
    snapshotBlock: outcomesRes.snapshot.toString(),
  };
}

/** Tenant-side: every terms record that names this tenant. */
export async function getTermsForTenant(
  tenant: Address,
  snapshot?: bigint,
): Promise<TermsDto[]> {
  const reader = createReader();
  const res = await walk(reader, [
    eq("project", str(PROJECT)),
    eq("entity_type", str("deposit_terms")),
    eq("tenant_wallet", addr(tenant)),
  ], undefined, snapshot);
  return res.entities.map(toTermsDto);
}

/** Terms signed by this landlord that have not yet been answered by an
 *  outcome. */
export async function getOpenTermsForTenant(tenant: Address): Promise<TermsDto[]> {
  const reader = createReader();
  const snapshot = await reader.getBlockNumber({ cacheTime: 0 });
  const [terms, outcomesRes] = await Promise.all([
    getTermsForTenant(tenant, snapshot),
    walk(
      reader,
      [eq("project", str(PROJECT)), eq("entity_type", str("deposit_outcome"))],
      tenant,
      snapshot,
    ),
  ]);
  const answered = new Set(
    outcomesRes.entities
      .map((o) => attrKey(o.attributes, "terms_key"))
      .filter((k): k is Hex => !!k),
  );
  return terms.filter((t) => !answered.has(t.entityKey as Hex));
}

export async function getEvidenceForOutcome(outcomeKey: Hex): Promise<EvidenceDto[]> {
  const reader = createReader();
  const res = await walk(reader, [
    eq("project", str(PROJECT)),
    eq("entity_type", str("evidence_log")),
    eq("outcome_key", key(outcomeKey)),
  ]);
  return res.entities.map(toEvidenceDto);
}

function toProfileDto(e: Entity): ProfileDto {
  return {
    entityKey: e.key,
    creator: e.creator,
    name: attrStr(e.attributes, "display_name") ?? "",
    city: attrStr(e.attributes, "city") ?? "",
  };
}

/** A landlord's self-signed profile, if any (creator-scoped — only they can
 *  name themselves). */
export async function getProfile(landlord: Address): Promise<ProfileDto | null> {
  const reader = createReader();
  const res = await walk(
    reader,
    [eq("project", str(PROJECT)), eq("entity_type", str("landlord_profile"))],
    landlord,
  );
  const p = res.entities[0];
  return p ? toProfileDto(p) : null;
}

/** The landlord directory — read entirely from chain. Every wallet that has
 *  signed a `deposit_terms` is a landlord; its display name/city come from a
 *  self-signed `landlord_profile` (creator === landlord — only they can
 *  name themselves). No profiles → address-only entry, still real. */
export async function listDirectory(): Promise<
  { address: string; name?: string; city?: string; termsCount: number }[]
> {
  const reader = createReader();
  const snapshot = await reader.getBlockNumber({ cacheTime: 0 });
  const [termsRes, profilesRes] = await Promise.all([
    walk(reader, [
      eq("project", str(PROJECT)),
      eq("entity_type", str("deposit_terms")),
    ], undefined, snapshot),
    walk(reader, [
      eq("project", str(PROJECT)),
      eq("entity_type", str("landlord_profile")),
    ], undefined, snapshot),
  ]);
  return buildDirectory(termsRes.entities, profilesRes.entities);
}

function buildDirectory(
  termsEntities: Entity[],
  profileEntities: Entity[],
): { address: string; name?: string; city?: string; termsCount: number }[] {
  const profilesByCreator = new Map<string, ProfileDto>();
  for (const p of profileEntities.map(toProfileDto)) {
    // latest profile wins — profiles are replace-not-edit by design
    if (!profilesByCreator.has(p.creator.toLowerCase())) {
      profilesByCreator.set(p.creator.toLowerCase(), p);
    }
  }
  const counts = new Map<string, number>();
  for (const t of termsEntities) {
    const c = (t.creator as string).toLowerCase();
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([addrLc, termsCount]) => {
      const p = profilesByCreator.get(addrLc);
      return {
        address: termsEntities.find(
          (t) => (t.creator as string).toLowerCase() === addrLc,
        )!.creator as string,
        name: p?.name || undefined,
        city: p?.city || undefined,
        termsCount,
      };
    })
    .sort((a, b) => b.termsCount - a.termsCount);
}

export type HeroData = {
  directory: { address: string; name?: string; city?: string; termsCount: number }[];
  termsCount: number;
  outcomesCount: number;
  verifiedCount: number;
  featured: TermsDto | null;
  /** Up to 8 recent terms entities, rendered as the 3D hero field — each
   *  floating block carries a real entity key. */
  blocks: { key: string; label: string; featured: boolean }[];
  snapshot: string;
};

/** One-shot hero payload: directory + live counters + the newest real
 *  `deposit_terms` entity rendered as the dossier specimen, plus the count
 *  of outcomes that pass the two-way-link verification — all from one block
 *  snapshot, all real chain data. */
export async function getHeroData(): Promise<HeroData> {
  const reader = createReader();
  const snapshot = await reader.getBlockNumber({ cacheTime: 0 });
  const [termsRes, profilesRes, outcomesRes] = await Promise.all([
    walk(reader, [
      eq("project", str(PROJECT)),
      eq("entity_type", str("deposit_terms")),
    ], undefined, snapshot),
    walk(reader, [
      eq("project", str(PROJECT)),
      eq("entity_type", str("landlord_profile")),
    ], undefined, snapshot),
    walk(reader, [
      eq("project", str(PROJECT)),
      eq("entity_type", str("deposit_outcome")),
    ], undefined, snapshot),
  ]);
  const terms = termsRes.entities.map(toTermsDto);
  const outcomes = outcomesRes.entities.map((e) =>
    toOutcomeDto(e, /* verified recomputed below */ false, false),
  );
  const termsByKey = new Map(terms.map((t) => [t.entityKey.toLowerCase(), t]));
  const verifiedCount = outcomes.reduce((n, o) => {
    const t = o.termsKey ? termsByKey.get(o.termsKey.toLowerCase()) : undefined;
    if (!t) return n;
    return isAddressEqual(t.creator as Address, o.landlord as Address) &&
      isAddressEqual(t.tenant as Address, o.creator as Address)
      ? n + 1
      : n;
  }, 0);
  const featured =
    terms.reduce<TermsDto | null>(
      (best, t) =>
        !best || BigInt(t.createdAtMs) > BigInt(best.createdAtMs) ? t : best,
      null,
    ) ?? null;
  const blocks = [...terms]
    .sort((a, b) => Number(BigInt(b.createdAtMs) - BigInt(a.createdAtMs)))
    .slice(0, 8)
    .map((t) => ({
      key: t.entityKey,
      label: t.city || "deposit_terms",
      featured: featured?.entityKey === t.entityKey,
    }));
  return {
    directory: buildDirectory(termsRes.entities, profilesRes.entities),
    termsCount: terms.length,
    outcomesCount: outcomes.length,
    verifiedCount,
    featured,
    blocks,
    snapshot: snapshot.toString(),
  };
}
