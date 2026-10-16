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
) {
  const snapshot = await reader.getBlockNumber({ cacheTime: 0 });
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
    .atBlock(snapshot)
    .limit(200);
  if (creator) sel = sel.createdBy(creator);
  let page = await sel.fetch();
  if (page.blockNumber !== snapshot) throw new Error("Query snapshot mismatch");
  const entities = [...page.entities] as unknown as Entity[];
  let pages = 1;
  while (page.hasNextPage()) {
    if (pages >= MAX_PAGES) throw new Error("Query page budget exhausted");
    page = await page.next();
    if (page.blockNumber !== snapshot) throw new Error("Query snapshot mismatch");
    pages++;
    entities.push(...(page.entities as unknown as Entity[]));
  }
  return { snapshot, entities };
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
  const [outcomesRes, termsRes] = await Promise.all([
    walk(reader, [
      eq("project", str(PROJECT)),
      eq("entity_type", str("deposit_outcome")),
      eq("landlord_wallet", addr(landlord)),
    ]),
    walk(
      reader,
      [eq("project", str(PROJECT)), eq("entity_type", str("deposit_terms"))],
      landlord,
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
export async function getTermsForTenant(tenant: Address): Promise<TermsDto[]> {
  const reader = createReader();
  const res = await walk(reader, [
    eq("project", str(PROJECT)),
    eq("entity_type", str("deposit_terms")),
    eq("tenant_wallet", addr(tenant)),
  ]);
  return res.entities.map(toTermsDto);
}

/** Terms signed by this landlord that have not yet been answered by an
 *  outcome. */
export async function getOpenTermsForTenant(tenant: Address): Promise<TermsDto[]> {
  const reader = createReader();
  const [terms, outcomesRes] = await Promise.all([
    getTermsForTenant(tenant),
    walk(
      reader,
      [eq("project", str(PROJECT)), eq("entity_type", str("deposit_outcome"))],
      tenant,
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
  const [termsRes, profilesRes] = await Promise.all([
    walk(reader, [
      eq("project", str(PROJECT)),
      eq("entity_type", str("deposit_terms")),
    ]),
    walk(reader, [
      eq("project", str(PROJECT)),
      eq("entity_type", str("landlord_profile")),
    ]),
  ]);
  const profilesByCreator = new Map<string, ProfileDto>();
  for (const p of profilesRes.entities.map(toProfileDto)) {
    // latest profile wins — profiles are replace-not-edit by design
    if (!profilesByCreator.has(p.creator.toLowerCase())) {
      profilesByCreator.set(p.creator.toLowerCase(), p);
    }
  }
  const counts = new Map<string, number>();
  for (const t of termsRes.entities) {
    const c = (t.creator as string).toLowerCase();
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([addrLc, termsCount]) => {
      const p = profilesByCreator.get(addrLc);
      return {
        address: termsRes.entities.find(
          (t) => (t.creator as string).toLowerCase() === addrLc,
        )!.creator as string,
        name: p?.name || undefined,
        city: p?.city || undefined,
        termsCount,
      };
    })
    .sort((a, b) => b.termsCount - a.termsCount);
}
