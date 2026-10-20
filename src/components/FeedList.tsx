"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Badge, Card } from "./ui";
import { WalletAvatar } from "./WalletAvatar";
import { LinkHint } from "./LinkHint";
import { OUTCOME_LABEL, explorerEntityUrl } from "@/lib/arkiv/config";
import { fmtDate, inr, shortAddr, shortKey } from "@/lib/format";

const PAGE_SIZE = 10;

const EDGE = {
  returned_full: "border-l-success",
  returned_partial: "border-l-warn",
  withheld: "border-l-danger",
} as const;

/** Row as plain data — bigint fields arrive as strings because RSC props
 *  must be serializable. */
export type FeedRow = {
  key: string;
  creator: string;
  type: string;
  city: string;
  amount?: string;
  outcome?: string;
  landlord?: string;
  createdAtMs: string;
};

/** Client-paginated ledger: ten rows per view, newest first. Live updates
 *  re-render through the same state — the current page is preserved. */
export function FeedList({ rows }: { rows: FeedRow[] }) {
  const [page, setPage] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const current = Math.min(page, pageCount - 1); // rows can shrink on refetch
  const shown = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  function go(p: number) {
    setPage(p);
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    topRef.current?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <>
      <div ref={topRef} className="scroll-mt-20" aria-hidden />
      <ul className="mt-6 flex flex-col gap-2">
        {shown.map((r) => {
          const edge =
            r.type === "deposit_outcome" && r.outcome
              ? EDGE[r.outcome as keyof typeof EDGE]
              : undefined;
          return (
            <li key={r.key}>
              <Card className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 ${edge ? `border-l-2 ${edge}` : ""}`}>
                <Badge tone={r.type === "deposit_outcome" ? "warn" : r.type === "deposit_terms" ? "primary" : "muted"}>
                  {r.type === "deposit_outcome" ? "outcome" : r.type === "deposit_terms" ? "terms" : "evidence"}
                </Badge>
                <span className="text-sm">
                  {r.type === "deposit_outcome" && r.outcome
                    ? OUTCOME_LABEL[r.outcome as keyof typeof OUTCOME_LABEL]
                    : r.type}
                  {r.amount !== undefined ? ` · ${inr(BigInt(r.amount))}` : ""}
                  {r.city ? ` · ${r.city}` : ""}
                </span>
                <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                  {BigInt(r.createdAtMs) > 0n ? <span>{fmtDate(r.createdAtMs)}</span> : null}
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <WalletAvatar address={r.creator} size={16} />
                    {shortAddr(r.creator)}
                  </span>
                  {r.landlord ? (
                    <Link href={`/landlord/${r.landlord}`}
                          className="text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
                      history<LinkHint />
                    </Link>
                  ) : null}
                  <a href={explorerEntityUrl(r.key)} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 font-mono text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
                    {shortKey(r.key)} <ExternalLink size={11} aria-hidden />
                  </a>
                </span>
              </Card>
            </li>
          );
        })}
      </ul>
      {pageCount > 1 && (
        <nav aria-label="Ledger pages" className="mt-4 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => go(current - 1)}
            disabled={current === 0}
            aria-label="Previous page"
            className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-border px-2.5 text-sm transition-colors disabled:opacity-40 [@media(hover:hover)]:hover:bg-muted"
          >
            <ChevronLeft size={14} aria-hidden /> Prev
          </button>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Page ${i + 1}`}
              aria-current={i === current ? "page" : undefined}
              className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-sm border px-2 font-mono text-xs transition-colors ${
                i === current
                  ? "border-foreground bg-foreground text-background"
                  : "border-border [@media(hover:hover)]:hover:bg-muted"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => go(current + 1)}
            disabled={current >= pageCount - 1}
            aria-label="Next page"
            className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-border px-2.5 text-sm transition-colors disabled:opacity-40 [@media(hover:hover)]:hover:bg-muted"
          >
            Next <ChevronRight size={14} aria-hidden />
          </button>
          <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {rows.length} entities
          </span>
        </nav>
      )}
    </>
  );
}
