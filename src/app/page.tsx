import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { LookupForm, type DirectoryEntry } from "@/components/LookupForm";
import { listDirectory } from "@/lib/arkiv/queries";
import { Skeleton } from "@/components/ui";
import AnimatedContent from "@/components/AnimatedContent";
import { ShieldCheck, FileSignature, Eye, Timer } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero — one scroll, straight into the tool. The lookup is the app. */}
      <section className="bg-stipple">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
        <AnimatedContent trigger="mount" distance={24} duration={0.7} stagger={0.08} className="flex flex-col gap-5">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            For renters in India · powered by Arkiv
          </p>
          <h1 className="max-w-3xl text-4xl leading-[1.02] tracking-tight sm:text-5xl md:text-6xl">
            Check a landlord’s deposit history before you pay.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Every outcome is signed by a tenant’s wallet on Arkiv and linked back to terms the
            landlord signed — a record no platform, landlord, or we can edit or delete.
          </p>
          <div className="mt-2 max-w-2xl">
            <Suspense fallback={<DirectorySkeleton />}>
              <DirectoryLookup />
            </Suspense>
          </div>
        </AnimatedContent>
        </div>
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
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground [@media(hover:hover)]:hover:bg-primary/90"
            >
              <FileSignature size={16} aria-hidden /> Record on Arkiv
            </Link>
            <Link
              href="/feed"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border-inverse px-4 text-sm font-medium text-text-inverse [@media(hover:hover)]:hover:bg-white/5"
            >
              <ShieldCheck size={16} aria-hidden className="text-primary" /> Watch the live ledger
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
 *  infinite skeleton. */
const DIRECTORY_BOUND_MS = 10_000;

type DirectoryResult =
  | { directory: DirectoryEntry[]; note?: undefined }
  | { directory: null; note: string };

function directoryFailure(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/ANON_COST_LIMITED|cost limit|quota|budget/i.test(msg)) {
    return "The testnet's public query budget is exhausted right now — search by wallet address above still works.";
  }
  return "The directory read failed — search by wallet address above still works.";
}

async function DirectoryLookup() {
  await io();
  const result = await Promise.race<DirectoryResult>([
    listDirectory().then(
      (directory) => ({ directory }),
      (e) => ({ directory: null, note: directoryFailure(e) }),
    ),
    new Promise<DirectoryResult>((res) =>
      setTimeout(
        () =>
          res({
            directory: null,
            note: "The directory didn’t answer in time — search by wallet address above still works.",
          }),
        DIRECTORY_BOUND_MS,
      ),
    ),
  ]);
  const termsCount =
    result.directory?.reduce((sum, l) => sum + l.termsCount, 0) ?? 0;
  return (
    <div>
      {termsCount > 0 && (
        <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-sm bg-primary px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-primary-foreground">
            {termsCount}
          </span>
          deposit terms signed on Arkiv — every one queryable, even if we vanished
        </p>
      )}
      <LookupForm directory={result.directory} directoryNote={result.note} />
    </div>
  );
}

function DirectorySkeleton() {
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
