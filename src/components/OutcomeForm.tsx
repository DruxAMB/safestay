"use client";

import { useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { TermsDto } from "@/lib/arkiv/schema";
import type { ActionResult } from "@/app/actions";
import { OUTCOME_LABEL, explorerEntityUrl, explorerTxUrl } from "@/lib/arkiv/config";
import { inr, shortAddr } from "@/lib/format";
import { Button, Card, EmptyState, Input, Label, Badge } from "@/components/ui";
import { useToast } from "@/components/Toaster";
import { LinkHint } from "./LinkHint";
import { friendlyError } from "@/lib/errors";
import { ExternalLink, FileUp, Loader2 } from "lucide-react";

async function sha256File(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  const h = await crypto.subtle.digest("SHA-256", buf);
  return "0x" + [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Tenant outcome form — presentational; `onSubmit` decides who signs:
 *  the connected wallet (real) or the server demo tenant (labeled). */
export function OutcomeForm({
  openTerms,
  onSubmit,
  signerNote,
  emptyTitle,
  emptyBody,
}: {
  openTerms: TermsDto[];
  onSubmit: (fd: FormData) => Promise<ActionResult>;
  signerNote: React.ReactNode;
  emptyTitle: string;
  emptyBody: string;
}) {
  const id = useId();
  // outcome_id generated once per mount — a retried submit reuses the SAME
  // id, so the chain returns the existing entity instead of a duplicate.
  const outcomeId = useMemo(() => `oc_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`, []);
  const [termsKey, setTermsKey] = useState(openTerms[0]?.entityKey ?? "");
  const [outcome, setOutcome] = useState<"returned_full" | "returned_partial" | "withheld">("returned_partial");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const t = useToast();

  const selected = openTerms.find((t) => t.entityKey === termsKey);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const fd = new FormData();
      fd.set("outcomeId", outcomeId);
      fd.set("termsKey", termsKey);
      fd.set("outcome", outcome);
      fd.set("amountReturnedInr", amount || "0");
      fd.set("comment", comment);
      try {
        if (file) {
          setHashing(true);
          try {
            fd.set("evidenceSha", await sha256File(file));
          } catch {
            throw new Error("Couldn't read that file — pick another and retry.");
          } finally {
            setHashing(false);
          }
          fd.set("evidenceKind", "photo");
          fd.set("evidenceName", file.name);
          fd.set("evidenceSize", String(file.size));
        }
        const r = await onSubmit(fd);
        setResult(r);
        if (r.ok) t.success("Outcome recorded on Arkiv", "The landlord's history updates live.");
        else t.danger("Couldn't record the outcome", r.error);
      } catch (err) {
        const msg = friendlyError(err);
        setResult({ ok: false, error: msg });
        t.danger("Couldn't record the outcome", msg);
      }
    });
  }

  if (openTerms.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  if (result?.ok) {
    return (
      <Card className="p-6" role="status">
        <Badge tone="success">Recorded on Arkiv</Badge>
        <h2 className="mt-3 font-medium">Outcome + evidence landed in one atomic batch</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Both entities are public on Tiramisu — the landlord’s history page updates live.
        </p>
        <div className="mt-4 flex flex-col gap-2 font-mono text-sm">
          <a href={explorerEntityUrl(result.entityKey)} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 break-all text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
            outcome {result.entityKey} <ExternalLink size={12} aria-hidden />
          </a>
          {result.extra && (
            <a href={explorerEntityUrl(result.extra)} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 break-all text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
              evidence {result.extra} <ExternalLink size={12} aria-hidden />
            </a>
          )}
          {result.txHash !== "0x0" && (
            <a href={explorerTxUrl(result.txHash)} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 break-all text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
              tx {result.txHash} <ExternalLink size={12} aria-hidden />
            </a>
          )}
        </div>
        {selected && (
          <Link href={`/landlord/${selected.creator}`}>
            <Button variant="secondary" className="mt-5">
              See it on the landlord’s history →
              <LinkHint />
            </Button>
          </Link>
        )}
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Card className="p-5">
        <Label htmlFor={`${id}-terms`}>Terms the landlord signed naming you</Label>
        <select
          id={`${id}-terms`}
          value={termsKey}
          onChange={(e) => setTermsKey(e.target.value)}
          className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-base transition-colors"
        >
          {openTerms.map((t) => (
            <option key={t.entityKey} value={t.entityKey}>
              {t.displayLabel || t.propertyLabel} · {inr(t.depositInr)} · {shortAddr(t.creator)}
            </option>
          ))}
        </select>
        {selected && (
          <p className="mt-2 text-xs text-muted-foreground">
            On-chain terms: {inr(selected.depositInr)} deposit · {selected.city} · the
            landlord cannot edit this record (read-only entity).
          </p>
        )}
      </Card>

      <Card className="p-5">
        <Label htmlFor={`${id}-outcome`}>What actually happened to the deposit?</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-labelledby={`${id}-outcome`}>
          {(Object.keys(OUTCOME_LABEL) as (keyof typeof OUTCOME_LABEL)[]).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={outcome === o}
              onClick={() => setOutcome(o)}
              className={`min-h-11 rounded-md border px-2 text-sm font-medium transition-colors ${
                outcome === o
                  ? "border-foreground bg-primary/30 text-foreground"
                  : "border-border bg-card [@media(hover:hover)]:hover:bg-muted"
              }`}
            >
              {OUTCOME_LABEL[o]}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Label htmlFor={`${id}-amount`}>Amount actually returned (₹)</Label>
          <Input
            id={`${id}-amount`}
            type="number"
            inputMode="numeric"
            min={0}
            max={selected ? selected.depositInr : undefined}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={selected ? `of ${selected.depositInr} promised` : "0"}
            required={outcome !== "withheld"}
            disabled={outcome === "withheld"}
          />
        </div>

        <div className="mt-4">
          <Label htmlFor={`${id}-comment`}>What happened (public, ≤280 chars)</Label>
          <textarea
            id={`${id}-comment`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={280}
            rows={3}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-base transition-colors focus:border-ring focus:outline-none"
            placeholder="e.g. Returned ₹9,000 of ₹30,000 — 'deep cleaning' deduction with no bills."
          />
        </div>
      </Card>

      <Card className="p-5">
        <Label htmlFor={`${id}-file`}>Evidence (optional — only the hash is stored)</Label>
        <label
          htmlFor={`${id}-file`}
          className="flex min-h-20 cursor-pointer items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/40 px-4 text-sm text-muted-foreground transition-colors [@media(hover:hover)]:hover:bg-muted"
        >
          <FileUp size={18} aria-hidden />
          {file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : "Choose a photo of the flat / chat screenshot"}
        </label>
        <input
          id={`${id}-file`}
          type="file"
          accept="image/*,.pdf"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          The file never leaves your device — its SHA-256 lands on Arkiv in the same
          transaction as the outcome. That hash is proof the evidence existed and wasn’t
          doctored later.
        </p>
      </Card>

      {result && !result.ok && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {result.error}
        </p>
      )}

      <Button type="submit" disabled={pending || hashing || !termsKey || (outcome !== "withheld" && !amount)}>
        {(pending || hashing) && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {hashing ? "Hashing evidence…" : pending ? "Writing to Arkiv…" : "Record outcome + evidence on Arkiv"}
      </Button>
      <p className="text-xs text-muted-foreground">{signerNote}</p>
    </form>
  );
}
