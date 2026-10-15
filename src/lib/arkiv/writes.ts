import "server-only";
import { eq } from "@arkiv-network/sdk/query";
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils";
import { str } from "@arkiv-network/sdk/attr";
import type { Address, Hex } from "viem";
import { PROJECT, type Outcome, type EvidenceKind } from "./config";
import { createReader, landlordWallet, tenantWallet } from "./clients";
import { evidenceAttrs, outcomeAttrs, termsAttrs } from "./schema";

/**
 * One serialized queue per signer. Concurrent server actions writing from
 * the same account would race the entity-minting nonce and invalidate key
 * predictions (arkiv-write-safety). Process-level: fine for one demo
 * server; a real deployment needs an account-wide coordinator.
 */
let tenantQueue: Promise<unknown> = Promise.resolve();
let landlordQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(role: "tenant" | "landlord", fn: () => Promise<T>): Promise<T> {
  const q = role === "tenant" ? tenantQueue : landlordQueue;
  const next = q.then(fn, fn);
  if (role === "tenant") tenantQueue = next;
  else landlordQueue = next;
  return next;
}

export type WriteResult = {
  entityKey: Hex;
  txHash: Hex;
  expiresAtBlock: string;
};

/** Chain-native idempotency: the client-generated row id is an indexed
 *  attribute, so a retried submit returns the existing record instead of
 *  writing a duplicate. */
async function findByRowId(
  entityType: string,
  idAttr: "terms_id" | "outcome_id",
  id: string,
  creator: Address,
): Promise<Hex | null> {
  const reader = createReader();
  const page = await reader
    .select({ key: true })
    .where(
      eq("project", str(PROJECT)),
      eq("entity_type", str(entityType)),
      eq(idAttr, str(id)),
    )
    .createdBy(creator)
    .limit(1)
    .fetch();
  return page.entities[0]?.key ?? null;
}

/** Landlord signs `deposit_terms` naming a tenant wallet. Readonly — the
 *  promise can never be edited, only outlived. */
export async function recordTerms(input: {
  termsId: string;
  tenant: Address;
  depositInr: bigint;
  city: string;
  propertyLabel: string;
  moveIn: string;
  durationMonths: number;
  note: string;
}): Promise<WriteResult> {
  return enqueue("landlord", async () => {
    const wallet = landlordWallet();
    const existing = await findByRowId(
      "deposit_terms", "terms_id", input.termsId, wallet.account.address,
    );
    if (existing) {
      const e = await createReader().getEntity(existing);
      return { entityKey: existing, txHash: "0x0" as Hex, expiresAtBlock: e.expiresAt!.toString() };
    }
    const res = await wallet.createEntity({
      payload: jsonToPayload({
        display_label: input.propertyLabel,
        move_in: input.moveIn,
        duration_months: input.durationMonths,
        note: input.note.slice(0, 280),
      }),
      contentType: "application/json",
      attributes: termsAttrs({
        tenant: input.tenant,
        depositInr: input.depositInr,
        city: input.city,
        propertyLabel: input.propertyLabel,
        termsId: input.termsId,
      }),
      expires: ExpirationTime.fromDays(365),
      flags: { readonly: true, permissionlessExtension: false },
    });
    return { entityKey: res.entityKey, txHash: res.txHash, expiresAtBlock: res.expiresAt.toString() };
  });
}

/** Tenant records `deposit_outcome` + `evidence_log` in ONE atomic
 *  executeBatch: predict both keys, evidence references the predicted
 *  outcome key, validate every returned key in order. */
export async function recordOutcome(input: {
  outcomeId: string;
  termsKey: Hex;
  outcome: Outcome;
  amountReturnedInr: bigint;
  comment: string;
  evidence?: { sha256: Hex; kind: EvidenceKind; filenameHint: string; byteSize: number };
}): Promise<{ outcome: WriteResult; evidenceKey: Hex | null; txHash: Hex }> {
  return enqueue("tenant", async () => {
    const wallet = tenantWallet();
    const reader = createReader();

    const existing = await findByRowId(
      "deposit_outcome", "outcome_id", input.outcomeId, wallet.account.address,
    );
    if (existing) {
      const e = await reader.getEntity(existing);
      return {
        outcome: { entityKey: existing, txHash: "0x0" as Hex, expiresAtBlock: e.expiresAt!.toString() },
        evidenceKey: null,
        txHash: "0x0" as Hex,
      };
    }

    // The link must close both ways: terms must exist, name this tenant,
    // and be signed by the landlord it accuses.
    const terms = await reader.getEntity(input.termsKey);
    const tAttrs = terms.attributes as Record<string, { type: string; value: unknown }>;
    const named = tAttrs.tenant_wallet?.value as Address | undefined;
    if (!named || named.toLowerCase() !== wallet.account.address.toLowerCase()) {
      throw new Error("These terms do not name this tenant — outcome rejected");
    }
    const landlord = terms.creator as Address;

    const creates: Parameters<typeof wallet.executeBatch>[0]["creates"] = [];
    let outcomeKey: Hex;
    let evidenceKey: Hex | null = null;

    if (input.evidence) {
      const [pOutcome, pEvidence] = await reader.predictEntityKeys({
        owner: wallet.account.address,
        count: 2,
      });
      outcomeKey = pOutcome.key;
      evidenceKey = pEvidence.key;
      creates.push(
        {
          salt: pOutcome.salt,
          payload: jsonToPayload({
            comment: input.comment.slice(0, 280),
            deposit_inr: Number(
              (terms.attributes as Record<string, { value: unknown }>).deposit_inr?.value ?? 0,
            ),
          }),
          contentType: "application/json",
          attributes: outcomeAttrs({
            landlord,
            termsKey: input.termsKey,
            outcome: input.outcome,
            amountReturnedInr: input.amountReturnedInr,
            city: (tAttrs.city?.value as string) ?? "",
            outcomeId: input.outcomeId,
          }),
          expires: ExpirationTime.fromDays(730),
          flags: { readonly: true, permissionlessExtension: false },
        },
        {
          salt: pEvidence.salt,
          payload: jsonToPayload({
            filename_hint: input.evidence.filenameHint.slice(0, 80),
            byte_size: input.evidence.byteSize,
          }),
          contentType: "application/json",
          attributes: evidenceAttrs({
            outcomeKey: pOutcome.key,
            landlord,
            sha256: input.evidence.sha256,
            kind: input.evidence.kind,
          }),
          expires: ExpirationTime.fromDays(730),
          flags: { readonly: true, permissionlessExtension: false },
        },
      );
      const batch = await wallet.executeBatch({ creates });
      // Complete ordered validation — a partial match means reconcile, not resend.
      if (
        batch.createdEntities.length !== 2 ||
        batch.createdEntities[0] !== pOutcome.key ||
        batch.createdEntities[1] !== pEvidence.key
      ) {
        throw new Error(
          `Batch result mismatch after ${batch.txHash}; reconcile before retry`,
        );
      }
      const o = await reader.getEntity(outcomeKey);
      return {
        outcome: { entityKey: outcomeKey, txHash: batch.txHash, expiresAtBlock: o.expiresAt!.toString() },
        evidenceKey,
        txHash: batch.txHash,
      };
    }

    const res = await wallet.createEntity({
      payload: jsonToPayload({
        comment: input.comment.slice(0, 280),
        deposit_inr: Number(
          (terms.attributes as Record<string, { value: unknown }>).deposit_inr?.value ?? 0,
        ),
      }),
      contentType: "application/json",
      attributes: outcomeAttrs({
        landlord,
        termsKey: input.termsKey,
        outcome: input.outcome,
        amountReturnedInr: input.amountReturnedInr,
        city: (tAttrs.city?.value as string) ?? "",
        outcomeId: input.outcomeId,
      }),
      expires: ExpirationTime.fromDays(730),
      flags: { readonly: true, permissionlessExtension: false },
    });
    return {
      outcome: { entityKey: res.entityKey, txHash: res.txHash, expiresAtBlock: res.expiresAt.toString() },
      evidenceKey: null,
      txHash: res.txHash,
    };
  });
}

/** Lifetime Extension — the landlord renews a terms record while the
 *  tenancy is active. Only the owner may extend (no permissionless flag). */
export async function renewTerms(termsKey: Hex): Promise<WriteResult> {
  return enqueue("landlord", async () => {
    const reader = createReader();
    const wallet = landlordWallet();
    const e = await reader.getEntity(termsKey);
    if ((e.creator as string).toLowerCase() !== wallet.account.address.toLowerCase()) {
      throw new Error("Only the signing landlord can renew these terms");
    }
    const res = await wallet.extendEntity({
      entityKey: termsKey,
      expires: ExpirationTime.atBlock(e.expiresAt! + BigInt(365 * 43200)),
    });
    return { entityKey: termsKey, txHash: res.txHash, expiresAtBlock: res.expiresAt.toString() };
  });
}
