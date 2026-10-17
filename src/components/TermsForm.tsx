"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { isAddress } from "viem";
import type { ActionResult } from "@/app/actions";
import { explorerEntityUrl, explorerTxUrl } from "@/lib/arkiv/config";
import { Button, Card, Input, Label, Badge } from "@/components/ui";
import { useToast } from "@/components/Toaster";
import { friendlyError } from "@/lib/errors";
import { ExternalLink, Loader2 } from "lucide-react";

/** Landlord terms-signing form — presentational; `onSubmit` decides who
 *  signs (connected wallet or server demo landlord). */
export function TermsForm({
  defaultTenant,
  onSubmit,
  signerNote,
  showProfileName = false,
}: {
  defaultTenant: string;
  onSubmit: (fd: FormData) => Promise<ActionResult>;
  signerNote: React.ReactNode;
  showProfileName?: boolean;
}) {
  const id = useId();
  const termsId = useMemo(() => `t_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`, []);
  const [tenant, setTenant] = useState(defaultTenant);
  const [deposit, setDeposit] = useState("");
  const [city, setCity] = useState("");
  const [label, setLabel] = useState("");
  const [moveIn, setMoveIn] = useState("2026-10");
  const [months, setMonths] = useState("12");
  const [note, setNote] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const t = useToast();

  const tenantOk = isAddress(tenant.trim() as `0x${string}`);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const fd = new FormData();
      fd.set("termsId", termsId);
      fd.set("tenant", tenant.trim());
      fd.set("depositInr", deposit);
      fd.set("city", city);
      fd.set("propertyLabel", label);
      fd.set("moveIn", moveIn);
      fd.set("durationMonths", months);
      fd.set("note", note);
      if (displayName.trim()) fd.set("displayName", displayName.trim());
      try {
        const r = await onSubmit(fd);
        setResult(r);
        if (r.ok) t.success("Deposit terms signed on Arkiv", "The record is live — history pages update in seconds.");
        else t.danger("Couldn't sign the terms", r.error);
      } catch (err) {
        const msg = friendlyError(err);
        setResult({ ok: false, error: msg });
        t.danger("Couldn't sign the terms", msg);
      }
    });
  }

  if (result?.ok) {
    return (
      <Card className="p-6" role="status">
        <Badge tone="success">Terms signed on Arkiv</Badge>
        <p className="mt-3 text-sm text-muted-foreground">
          A read-only <code className="font-mono">deposit_terms</code> entity now names the
          tenant wallet — it can’t be edited, only outlived. Share the tenant their link:
          they record the outcome against this exact record.
        </p>
        <div className="mt-4 flex flex-col gap-2 font-mono text-sm">
          <a href={explorerEntityUrl(result.entityKey)} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 break-all text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
            terms {result.entityKey} <ExternalLink size={12} aria-hidden />
          </a>
          {result.txHash !== "0x0" && (
            <a href={explorerTxUrl(result.txHash)} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 break-all text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
              tx {result.txHash} <ExternalLink size={12} aria-hidden />
            </a>
          )}
        </div>
        <Button variant="secondary" className="mt-5" onClick={() => setResult(null)}>
          Sign another
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Card className="p-5">
        {showProfileName && (
          <div className="mb-4">
            <Label htmlFor={`${id}-name`}>Your display name (first time only — joins the directory)</Label>
            <Input
              id={`${id}-name`}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sunrise PG"
              maxLength={60}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Self-signed — only your wallet can claim this name, and it lands in the same
              transaction as the terms.
            </p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${id}-label`}>Property / room label</Label>
            <Input id={`${id}-label`} value={label} onChange={(e) => setLabel(e.target.value)}
                   placeholder="e.g. btm_pg_bed_9" required maxLength={60} />
          </div>
          <div>
            <Label htmlFor={`${id}-city`}>City</Label>
            <Input id={`${id}-city`} value={city} onChange={(e) => setCity(e.target.value)}
                   placeholder="e.g. bengaluru" required maxLength={40} />
          </div>
          <div>
            <Label htmlFor={`${id}-deposit`}>Deposit amount (₹)</Label>
            <Input id={`${id}-deposit`} type="number" inputMode="numeric" min={1}
                   value={deposit} onChange={(e) => setDeposit(e.target.value)}
                   placeholder="28000" required />
          </div>
          <div>
            <Label htmlFor={`${id}-movein`}>Move-in (YYYY-MM)</Label>
            <Input id={`${id}-movein`} value={moveIn} onChange={(e) => setMoveIn(e.target.value)}
                   pattern="\d{4}-\d{2}" maxLength={7} required />
          </div>
          <div>
            <Label htmlFor={`${id}-months`}>Duration (months)</Label>
            <Input id={`${id}-months`} type="number" inputMode="numeric" min={1} max={60}
                   value={months} onChange={(e) => setMonths(e.target.value)} required />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor={`${id}-tenant`}>Tenant wallet address</Label>
          <Input
            id={`${id}-tenant`}
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            placeholder="0x… — the wallet that will record the outcome"
            className="font-mono"
            aria-invalid={tenant !== "" && !tenantOk}
            required
          />
          {!tenantOk && tenant !== "" && (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              Needs a full wallet address — 0x + 40 hex characters.
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Tip for a solo demo: paste your own connected wallet — you can then record the
            outcome yourself in the tenant tab.
          </p>
        </div>
        <div className="mt-4">
          <Label htmlFor={`${id}-note`}>Terms note (public, ≤280 chars)</Label>
          <Input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)}
                 placeholder="e.g. 12-month lock-in, deposit refundable within 30 days." maxLength={280} />
        </div>
      </Card>

      {result && !result.ok && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {result.error}
        </p>
      )}

      <Button type="submit" disabled={pending || !tenantOk || !deposit || !city || !label}>
        {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {pending ? "Signing on Arkiv…" : "Sign deposit terms on Arkiv"}
      </Button>
      <p className="text-xs text-muted-foreground">{signerNote}</p>
    </form>
  );
}
