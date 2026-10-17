import { Suspense, cache } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { LookupForm } from "@/components/LookupForm";
import { InteractiveDossier } from "@/components/InteractiveDossier";
import { HeroSelection } from "@/components/HeroSelection";
import { BuildingScene } from "@/components/BuildingScene";
import { HeroBuildingImg } from "@/components/HeroBuildingImg";
import { getHeroData, type HeroData } from "@/lib/arkiv/queries";
import { Skeleton } from "@/components/ui";
import { LinkHint } from "@/components/LinkHint";
import AnimatedContent from "@/components/AnimatedContent";
import { ShieldCheck, FileSignature, Eye, Timer } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero — evidence dossier: the console is the tool, the specimen is
          a real on-chain entity, every number is live. */}
      <section className="bg-stipple relative overflow-hidden">
        <HeroSelection>
        {/* Full-bleed WebGL canvas — mounted on the section, not the right
            column, so the building silhouette can't clip at column edges.
            pointer-events-none inside; content z-10 stays interactive. */}
        <BuildingScene className="hidden lg:block" />
        <div className="pointer-events-none relative z-10 mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
          <AnimatedContent trigger="mount" distance={24} duration={0.7} stagger={0.08} className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div className="flex flex-col gap-5">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                For renters in India · powered by Arkiv
              </p>
              <h1 className="text-4xl leading-[1.02] tracking-tight sm:text-5xl md:text-6xl">
                Check a landlord’s deposit history before you pay.
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Every outcome is signed by a tenant’s wallet on Arkiv and linked back to terms the
                landlord signed — a record no platform, landlord, or we can edit or delete.
              </p>
              <div className="pointer-events-auto relative mt-2 border border-foreground/40 bg-card">
                <CornerMarks />
                <p className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Query the ledger — keyless, no signup
                </p>
                <div className="p-4">
                  <Suspense fallback={<ConsoleSkeleton />}>
                    <LookupConsole />
                  </Suspense>
                </div>
              </div>
            </div>
            <div className="relative lg:h-155">
              <HeroBuildingImg />
              <div className="pointer-events-auto mt-6 lg:absolute lg:top-0 lg:left-0 lg:mt-0 lg:w-78.75">
                <Suspense fallback={<DossierSkeleton />}>
                  <DossierSlot />
                </Suspense>
              </div>
            </div>
          </AnimatedContent>
          <Suspense fallback={null}>
            <StatsStrip />
          </Suspense>
        </div>
        </HeroSelection>
      </section>

      {/* Obsidian band — how it works, ruled columns. */}
      <section className="bg-surface-inverse text-text-inverse" aria-label="How it works">
        <AnimatedContent distance={24} duration={0.7} threshold={0.15} className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-inverse-muted">
            How it works
          </h2>
          <ol className="mt-6 grid gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border-inverse">
            {[
              {
                icon: FileSignature,
                title: "Landlord signs the terms",
                body: "Deposit amount and tenant wallet are written as a read-only Arkiv entity — signed by the landlord's own wallet.",
              },
              {
                icon: Eye,
                title: "Tenant records the outcome",
                body: "When the tenancy ends, the tenant records what was actually returned — linked back to the terms that named them.",
              },
              {
                icon: Timer,
                title: "History outlives the app",
                body: "Records live on Tiramisu for ~2 years, queryable by anyone. If this site vanished tomorrow, the record would not.",
              },
            ].map((s, i) => (
              <li key={s.title} className="sm:px-7 sm:first:pl-0 sm:last:pr-0">
                <div className="flex items-center gap-2 text-primary">
                  <s.icon size={18} aria-hidden />
                  <span className="text-xs font-medium text-text-inverse-muted">Step {i + 1}</span>
                </div>
                <h3 className="mt-2 text-lg font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-inverse-muted">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/record"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors [@media(hover:hover)]:hover:bg-primary/90"
            >
              <FileSignature size={16} aria-hidden /> Record on Arkiv
              <LinkHint />
            </Link>
            <Link
              href="/feed"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border-inverse px-4 text-sm font-medium text-text-inverse transition-colors [@media(hover:hover)]:hover:bg-white/5"
            >
              <ShieldCheck size={16} aria-hidden className="text-primary" /> Watch the live ledger
              <LinkHint />
            </Link>
          </div>
        </AnimatedContent>
      </section>
    </div>
  );
}

/** Bound the chain read — Tiramisu is a public testnet and the path to it
 *  can flap, and the anonymous query budget can be exhausted. The search
 *  form works by wallet address without the directory; on failure we
 *  render it with an honest note naming the real cause instead of an
 *  infinite skeleton. React `cache` dedupes the three hero consumers
 *  (console, dossier, stats) onto one fetch per render. */
const DIRECTORY_BOUND_MS = 10_000;

type HeroResult =
  | { kind: "ok"; data: HeroData }
  | { kind: "timeout" }
  | { kind: "error"; error: unknown };

const heroData = cache(async (): Promise<HeroResult> => {
  const timeout = new Promise<HeroResult>((res) =>
    setTimeout(() => res({ kind: "timeout" }), DIRECTORY_BOUND_MS),
  );
  return Promise.race([
    getHeroData().then(
      (data): HeroResult => ({ kind: "ok", data }),
      (error): HeroResult => ({ kind: "error", error }),
    ),
    timeout,
  ]);
});

async function tryHeroData(): Promise<{ data: HeroData | null; note?: string }> {
  const res = await heroData();
  if (res.kind === "ok") return { data: res.data };
  let note = "The directory didn’t answer in time — search by wallet address still works.";
  if (res.kind === "error") {
    const msg = res.error instanceof Error ? res.error.message : String(res.error);
    note = /ANON_COST_LIMITED|cost limit|quota|budget/i.test(msg)
      ? "The testnet's public query budget is exhausted right now — search by wallet address still works."
      : "The directory read failed — search by wallet address still works.";
  }
  return { data: null, note };
}

function CornerMarks() {
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

async function LookupConsole() {
  await io();
  const { data, note } = await tryHeroData();
  return <LookupForm directory={data?.directory ?? null} directoryNote={note} />;
}

async function DossierSlot() {
  const { data } = await tryHeroData();
  return (
    <InteractiveDossier
      featured={data?.featured ?? null}
      terms={data?.terms ?? []}
      snapshot={data?.snapshot ?? "0"}
    />
  );
}

async function StatsStrip() {
  const { data } = await tryHeroData();
  if (!data) return null;
  const stats: [string, number][] = [
    ["Deposit terms signed", data.termsCount],
    ["Outcomes recorded", data.outcomesCount],
    ["Verified on-chain", data.verifiedCount],
    ["Landlords on the ledger", data.directory.length],
  ];
  return (
    <dl className="mt-14 grid grid-cols-2 border border-foreground/40 bg-card sm:grid-cols-4 sm:divide-x sm:divide-border">
      {stats.map(([label, n]) => (
        <div key={label} className="px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-mono text-2xl tabular-nums">{n}</dd>
        </div>
      ))}
    </dl>
  );
}

function ConsoleSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="h-11 w-full rounded-md" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-11 w-44 rounded-sm" />
        <Skeleton className="h-11 w-52 rounded-sm" />
        <Skeleton className="h-11 w-40 rounded-sm" />
      </div>
    </div>
  );
}

function DossierSkeleton() {
  return (
    <div aria-busy className="border border-foreground/40 bg-card">
      <Skeleton className="m-4 h-3 w-1/2" />
      <Skeleton className="mx-4 h-8 w-full" />
      <div className="m-4 grid grid-cols-2 gap-px">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="m-4 h-3 w-2/3" />
    </div>
  );
}
