"use server";

import { z } from "zod";
import { isAddress } from "viem";
import { refresh } from "next/cache";
import { recordOutcome, recordTerms, renewTerms } from "@/lib/arkiv/writes";
import type { Outcome, EvidenceKind } from "@/lib/arkiv/config";

export type ActionResult =
  | { ok: true; txHash: string; entityKey: string; extra?: string }
  | { ok: false; error: string };

const OutcomeSchema = z.object({
  outcomeId: z.string().min(8).max(64),
  termsKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "invalid terms key"),
  outcome: z.enum(["returned_full", "returned_partial", "withheld"]),
  amountReturnedInr: z.coerce.bigint().min(0n),
  comment: z.string().max(280).default(""),
  evidenceSha: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  evidenceKind: z.enum(["photo", "chat", "doc"]).optional(),
  evidenceName: z.string().max(80).optional(),
  evidenceSize: z.coerce.number().int().min(0).optional(),
});

export async function recordOutcomeAction(form: FormData): Promise<ActionResult> {
  const parsed = OutcomeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid input" };
  }
  const p = parsed.data;
  try {
    const res = await recordOutcome({
      outcomeId: p.outcomeId,
      termsKey: p.termsKey as `0x${string}`,
      outcome: p.outcome as Outcome,
      amountReturnedInr: p.amountReturnedInr,
      comment: p.comment,
      evidence: p.evidenceSha
        ? {
            sha256: p.evidenceSha as `0x${string}`,
            kind: (p.evidenceKind ?? "photo") as EvidenceKind,
            filenameHint: p.evidenceName ?? "evidence",
            byteSize: p.evidenceSize ?? 0,
          }
        : undefined,
    });
    refresh();
    return {
      ok: true,
      txHash: res.txHash,
      entityKey: res.outcome.entityKey,
      extra: res.evidenceKey ?? undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "write failed" };
  }
}

const TermsSchema = z.object({
  termsId: z.string().min(8).max(64),
  tenant: z.string().refine(isAddress, "invalid tenant wallet"),
  depositInr: z.coerce.bigint().min(1n, "deposit must be positive"),
  city: z.string().min(2).max(40),
  propertyLabel: z.string().min(2).max(60),
  moveIn: z.string().max(10).default("2026-10"),
  durationMonths: z.coerce.number().int().min(1).max(60).default(12),
  note: z.string().max(280).default(""),
});

export async function recordTermsAction(form: FormData): Promise<ActionResult> {
  const parsed = TermsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid input" };
  }
  try {
    const res = await recordTerms({
      ...parsed.data,
      tenant: parsed.data.tenant as `0x${string}`,
    });
    refresh();
    return { ok: true, txHash: res.txHash, entityKey: res.entityKey };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "write failed" };
  }
}

export async function renewTermsAction(termsKey: string): Promise<ActionResult> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(termsKey)) return { ok: false, error: "invalid key" };
  try {
    const res = await renewTerms(termsKey as `0x${string}`);
    refresh();
    return { ok: true, txHash: res.txHash, entityKey: res.entityKey };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "renew failed" };
  }
}


