import { inr, shortAddr, expiryText } from "@/lib/format";
import type { TermsDto } from "@/lib/arkiv/schema";

/** Registration "+" marks at a frame's corners — blueprint/drafting language. */
function RegistrationMarks() {
  const c = "pointer-events-none absolute font-mono text-xs leading-none text-foreground/50 select-none";
  return (
    <>
      <span aria-hidden className={`${c} -left-1.5 -top-2.5`}>+</span>
      <span aria-hidden className={`${c} -right-1.5 -top-2.5`}>+</span>
      <span aria-hidden className={`${c} -left-1.5 -bottom-2`}>+</span>
      <span aria-hidden className={`${c} -right-1.5 -bottom-2`}>+</span>
    </>
  );
}

function Field({ label, children, mono = true }: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="border-t border-border px-4 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm ${mono ? "font-mono" : ""}`}>{children}</p>
    </div>
  );
}

/** A HUD callout — dot + leader line + mono note. On xl it floats beside the
 *  card edge; smaller screens render the same notes stacked inside. */
function Annotation({ side, y, text }: { side: "left" | "right"; y: string; text: string }) {
  return (
    <div
      aria-hidden
      className={`absolute hidden w-44 xl:block ${side === "right" ? "left-full" : "right-full"} ${y}`}
    >
      <div className="flex items-center gap-0">
        {side === "right" ? (
          <>
            <span className="h-px w-10 bg-foreground/40" />
            <span className="h-1.5 w-1.5 rounded-full border border-foreground/60 bg-background" />
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full border border-foreground/60 bg-background" />
            <span className="h-px w-10 bg-foreground/40" />
          </>
        )}
      </div>
      <p className={`mt-1.5 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-muted-foreground ${side === "left" ? "text-right pr-12" : "pl-12"}`}>
        {text}
      </p>
    </div>
  );
}

/** The hero specimen: a real `deposit_terms` entity rendered as an evidence
 *  dossier — every field is live chain data, annotations explain why each
 *  one matters. */
export function EntityDossier({ entity, snapshot }: { entity: TermsDto; snapshot: string }) {
  const signed = entity.createdAtMs !== "0"
    ? new Date(Number(entity.createdAtMs)).toISOString().slice(0, 10)
    : "—";
  return (
    <div className="relative">
      {/* Orbiting annotations — xl only */}
      <Annotation side="right" y="top-10" text="Creator = landlord wallet — only that key could sign these terms" />
      <Annotation side="right" y="bottom-8" text={`Auto-expires at block ${entity.expiresAtBlock} — Entity Expiration, not our server`} />
      <Annotation side="right" y="top-32" text="Names the tenant — an outcome verifies only if that wallet signed it" />

      <div className="relative border border-foreground/40 bg-card">
        <RegistrationMarks />
        {/* Header strip */}
        <div className="flex items-center justify-between border-b border-foreground/40 px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Specimen — deposit_terms
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Arkiv · Tiramisu
          </p>
        </div>
        {/* Entity key — the artifact's identity */}
        <div className="border-b border-border px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Entity key</p>
          <p className="mt-1 break-all font-mono text-[11px] leading-snug text-foreground">{entity.entityKey}</p>
        </div>
        {/* Field grid */}
        <div className="grid grid-cols-2">
          <Field label="Deposit">{inr(entity.depositInr)}</Field>
          <Field label="Tenant named">{shortAddr(entity.tenant)}</Field>
          <Field label="City" mono={false}>{entity.city ? entity.city : "—"}</Field>
          <Field label="Signed">{signed}</Field>
          <Field label="Expires" mono={false}>{expiryText(entity.expiresAtBlock, snapshot)}</Field>
          <div className="border-t border-border px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Status</p>
            <p className="mt-1 inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="font-mono text-xs font-medium uppercase tracking-wider">Live on-chain</span>
            </p>
          </div>
        </div>
        {/* Footer strip */}
        <div className="flex items-center justify-between border-t border-foreground/40 px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Signed by {shortAddr(entity.creator)}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            blk {snapshot}
          </p>
        </div>
      </div>

      {/* Same annotations, stacked for < xl */}
      <ul className="mt-4 space-y-1.5 xl:hidden">
        {[
          "Creator = landlord wallet — only that key could sign these terms",
          "Names the tenant — an outcome verifies only if that wallet signed it",
          "Auto-expires — Entity Expiration, not our server",
        ].map((t) => (
          <li key={t} className="flex gap-2 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-muted-foreground">
            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/50" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
