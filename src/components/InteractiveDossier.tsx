"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EntityDossier } from "./EntityDossier";
import { useHeroSelection } from "./HeroSelection";
import { shortAddr } from "@/lib/format";
import type { TermsDto } from "@/lib/arkiv/schema";

function EmptyDossier() {
  const c = "pointer-events-none absolute font-mono text-xs leading-none text-foreground/50 select-none";
  return (
    <div className="relative border border-foreground/40 bg-card p-4">
      <span aria-hidden className={`${c} -left-1.5 -top-2.5`}>+</span>
      <span aria-hidden className={`${c} -right-1.5 -top-2.5`}>+</span>
      <span aria-hidden className={`${c} -left-1.5 -bottom-2`}>+</span>
      <span aria-hidden className={`${c} -right-1.5 -bottom-2`}>+</span>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Specimen — unavailable
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        No entity fetched — the chain read didn’t complete. The console left of
        here still works by wallet address.
      </p>
    </div>
  );
}

/** The hero specimen, made interactive: picking a landlord from the
 *  directory swaps the dossier to that landlord's latest signed terms —
 *  all client-side from the same snapshot payload, no refetch — and
 *  exposes the route to their full on-chain history. */
export function InteractiveDossier({
  featured,
  terms,
  snapshot,
}: {
  featured: TermsDto | null;
  terms: TermsDto[];
  snapshot: string;
}) {
  const { selected, live, registerTerms } = useHeroSelection();
  // Hand the snapshot terms to the scene — each one lights a unit marker.
  useEffect(() => {
    registerTerms(terms);
  }, [terms, registerTerms]);
  const shown =
    (selected
      ? terms
          .filter((t) => t.creator.toLowerCase() === selected.toLowerCase())
          .sort((a, b) => Number(BigInt(b.createdAtMs) - BigInt(a.createdAtMs)))[0]
      : undefined) ?? featured;
  if (!shown) return <EmptyDossier />;
  return (
    <div>
      <EntityDossier key={shown.entityKey} entity={shown} snapshot={snapshot} />
      {selected && (
        <Link
          href={`/landlord/${selected}`}
          className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground [@media(hover:hover)]:hover:text-primary"
        >
          View full history — {shortAddr(selected)} <ArrowRight size={12} aria-hidden />
        </Link>
      )}
      {live.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          {live.length} new {live.length === 1 ? "record" : "records"} on-chain since load
        </p>
      )}
    </div>
  );
}
