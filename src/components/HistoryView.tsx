import Link from "next/link";
import { ShieldCheck, ShieldAlert, ExternalLink, FileCheck2 } from "lucide-react";
import type { LandlordHistory } from "@/lib/arkiv/schema";
import { OUTCOME_LABEL, explorerEntityUrl, explorerAddressUrl } from "@/lib/arkiv/config";
import { inr, shortAddr, shortKey, expiryText } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";

const TONE = { returned_full: "success", returned_partial: "warn", withheld: "danger" } as const;

export function HistoryView({ h }: { h: LandlordHistory }) {
  const pct = h.totals.count > 0 && BigInt(h.totals.promisedInr) > 0n
    ? Math.round((Number(BigInt(h.totals.returnedInr) * 10000n / BigInt(h.totals.promisedInr))) / 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Totals card — the money shot */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              On-chain deposit record · {h.totals.count} outcomes · {h.terms.length} signed terms
            </p>
            <p className="mt-1 font-mono text-sm break-all">
              <a href={explorerAddressUrl(h.landlord)} target="_blank" rel="noopener noreferrer"
                 className="text-primary underline-offset-2 [@media(hover:hover)]:hover:underline">
                {h.landlord}
              </a>
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums">{pct}%</p>
            <p className="text-xs text-muted-foreground">of promised deposits returned</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="rounded-md bg-muted p-3">
            <dt className="text-xs text-muted-foreground">Promised</dt>
            <dd className="mt-1 font-semibold tabular-nums">{inr(h.totals.promisedInr)}</dd>
          </div>
          <div className="rounded-md bg-muted p-3">
            <dt className="text-xs text-muted-foreground">Returned</dt>
            <dd className="mt-1 font-semibold tabular-nums">{inr(h.totals.returnedInr)}</dd>
          </div>
          <div className="rounded-md bg-muted p-3">
            <dt className="text-xs text-muted-foreground">Withheld</dt>
            <dd className="mt-1 font-semibold tabular-nums text-danger">
              {inr((BigInt(h.totals.promisedInr) - BigInt(h.totals.returnedInr)).toString())}
            </dd>
          </div>
          <div className="rounded-md bg-muted p-3">
            <dt className="text-xs text-muted-foreground">Verified links</dt>
            <dd className="mt-1 font-semibold tabular-nums">{h.totals.verified}/{h.totals.count}</dd>
          </div>
        </dl>
      </Card>

      {/* Outcome records */}
      <section aria-label="Deposit outcomes">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Outcomes recorded by tenants
        </h2>
        {h.outcomes.length === 0 ? (
          <EmptyState
            title="No outcomes on record yet"
            body="No tenant has recorded a deposit result for this wallet on Arkiv. Records are signed by tenant wallets and cannot be planted or edited later."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {h.outcomes.map((o) => (
              <li key={o.entityKey}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[o.outcome]}>{OUTCOME_LABEL[o.outcome]}</Badge>
                    <span className="text-sm font-medium tabular-nums">
                      {inr(o.amountReturnedInr)} of {inr(o.depositInr)}
                    </span>
                    <span className="text-xs text-muted-foreground">· {o.city}</span>
                    <span className="ml-auto flex items-center gap-2">
                      {o.verified ? (
                        <Badge tone="success"><ShieldCheck size={12} aria-hidden /> verified link</Badge>
                      ) : o.termsMissing ? (
                        <Badge tone="warn"><ShieldAlert size={12} aria-hidden /> terms expired</Badge>
                      ) : (
                        <Badge tone="warn"><ShieldAlert size={12} aria-hidden /> unlinked</Badge>
                      )}
                    </span>
                  </div>
                  {o.comment && (
                    <p className="mt-2 text-sm text-muted-foreground">{o.comment}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 break-all text-xs text-muted-foreground">
                    <span>signed by tenant <span className="font-mono">{shortAddr(o.creator)}</span></span>
                    <span>{expiryText(o.expiresAtBlock, h.snapshotBlock)}</span>
                    <a href={explorerEntityUrl(o.entityKey)} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 font-mono text-primary underline-offset-2 [@media(hover:hover)]:hover:underline">
                      {shortKey(o.entityKey)} <ExternalLink size={11} aria-hidden />
                    </a>
                    {o.termsKey && (
                      <a href={explorerEntityUrl(o.termsKey)} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 font-mono text-primary underline-offset-2 [@media(hover:hover)]:hover:underline">
                        <FileCheck2 size={11} aria-hidden /> terms {shortKey(o.termsKey)}
                      </a>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Signed terms */}
      <section aria-label="Signed terms">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Terms signed by this landlord
        </h2>
        {h.terms.length === 0 ? (
          <EmptyState
            title="No signed terms"
            body="This wallet has not signed any deposit terms yet."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {h.terms.map((t) => (
              <li key={t.entityKey}>
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{t.displayLabel || t.propertyLabel}</p>
                    <span className="font-semibold tabular-nums">{inr(t.depositInr)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>tenant <span className="font-mono">{shortAddr(t.tenant)}</span></span>
                    <span>{t.city}</span>
                    <span>{expiryText(t.expiresAtBlock, h.snapshotBlock)}</span>
                    <a href={explorerEntityUrl(t.entityKey)} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 font-mono text-primary underline-offset-2 [@media(hover:hover)]:hover:underline">
                      {shortKey(t.entityKey)} <ExternalLink size={11} aria-hidden />
                    </a>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Read at block {h.snapshotBlock} on Tiramisu. Every record is an Arkiv entity signed by its
        creator’s wallet — the list cannot be edited by this site.{" "}
        <Link href="/about" className="text-primary underline-offset-2 [@media(hover:hover)]:hover:underline">
          How the trust model works
        </Link>
      </p>
    </div>
  );
}
