import Link from "next/link";
import { ShieldCheck, ShieldAlert, ExternalLink, FileCheck2 } from "lucide-react";
import type { LandlordHistory } from "@/lib/arkiv/schema";
import { OUTCOME_LABEL, explorerEntityUrl, explorerAddressUrl } from "@/lib/arkiv/config";
import { inr, shortAddr, shortKey, expiryText } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { LinkHint } from "@/components/LinkHint";
import { WalletAvatar } from "@/components/WalletAvatar";

const TONE = { returned_full: "success", returned_partial: "warn", withheld: "danger" } as const;
const EDGE = {
  returned_full: "border-l-success",
  returned_partial: "border-l-warn",
  withheld: "border-l-danger",
} as const;

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
            <p className="mt-1 flex items-center gap-2 font-mono text-sm">
              <WalletAvatar address={h.landlord} size={22} />
              <a href={explorerAddressUrl(h.landlord)} target="_blank" rel="noopener noreferrer"
                 className="break-all text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
                {h.landlord}
              </a>
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-medium tabular-nums">{pct}%</p>
            <p className="text-xs text-muted-foreground">of promised deposits returned</p>
          </div>
        </div>

        {/* The money shot: the withheld gap rendered as width, not words.
            Green = deposits that came back; the pink remainder = kept. */}
        <div className="mt-4">
          <div
            role="img"
            aria-label={`${pct}% of promised deposits returned`}
            className="h-2 w-full overflow-hidden rounded-full bg-danger-bg"
          >
            <div
              className="h-full rounded-full bg-success transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>returned</span>
            <span>withheld {h.totals.count ? 100 - pct : 0}%</span>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="rounded-md bg-muted p-3">
            <dt className="text-xs text-muted-foreground">Promised</dt>
            <dd className="mt-1 font-medium tabular-nums">{inr(h.totals.promisedInr)}</dd>
          </div>
          <div className="rounded-md bg-muted p-3">
            <dt className="text-xs text-muted-foreground">Returned</dt>
            <dd className="mt-1 font-medium tabular-nums">{inr(h.totals.returnedInr)}</dd>
          </div>
          <div className="rounded-md bg-muted p-3">
            <dt className="text-xs text-muted-foreground">Withheld</dt>
            <dd className="mt-1 font-medium tabular-nums text-danger">
              {inr((BigInt(h.totals.promisedInr) - BigInt(h.totals.returnedInr)).toString())}
            </dd>
          </div>
          <div className="rounded-md bg-muted p-3">
            <dt className="text-xs text-muted-foreground">Verified links</dt>
            <dd className="mt-1 font-medium tabular-nums">{h.totals.verified}/{h.totals.count}</dd>
          </div>
        </dl>
      </Card>

      {/* Outcome records */}
      <section aria-label="Deposit outcomes">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Outcomes recorded by tenants
        </h2>
        {h.outcomes.length === 0 ? (
          <EmptyState
            title="No outcomes on record"
            body="Careful what this means: an empty record is not a clean record. This landlord may simply have no SafeStay history — absence of complaints is not proof of honesty. Records start only when this wallet signs terms and a tenant answers."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {h.outcomes.map((o) => (
              <li key={o.entityKey}>
                <Card className={`border-l-2 p-4 ${EDGE[o.outcome]}`}>
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
                    <span className="inline-flex items-center gap-1.5">signed by tenant
                      <WalletAvatar address={o.creator} size={14} />
                      <span className="font-mono">{shortAddr(o.creator)}</span>
                    </span>
                    <span>{expiryText(o.expiresAtBlock, h.snapshotBlock)}</span>
                    <a href={explorerEntityUrl(o.entityKey)} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 font-mono text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
                      {shortKey(o.entityKey)} <ExternalLink size={11} aria-hidden />
                    </a>
                    {o.termsKey && (
                      <a href={explorerEntityUrl(o.termsKey)} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 font-mono text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
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
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Terms signed by this landlord
        </h2>
        {h.terms.length === 0 ? (
          <EmptyState
            title="No signed terms"
            body="This wallet has never signed deposit terms on SafeStay — it has no on-chain record yet. That tells you nothing either way; a blank wallet is not a trusted wallet."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {h.terms.map((t) => (
              <li key={t.entityKey}>
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{t.displayLabel || t.propertyLabel}</p>
                    <span className="font-medium tabular-nums">{inr(t.depositInr)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>tenant <span className="font-mono">{shortAddr(t.tenant)}</span></span>
                    <span>{t.city}</span>
                    <span>{expiryText(t.expiresAtBlock, h.snapshotBlock)}</span>
                    <a href={explorerEntityUrl(t.entityKey)} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 font-mono text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
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
        <Link href="/about" className="text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
          How the trust model works
          <LinkHint />
        </Link>
      </p>
    </div>
  );
}
