import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { LookupForm } from "@/components/LookupForm";
import { listDirectory } from "@/lib/arkiv/queries";
import { Skeleton } from "@/components/ui";
import { ShieldCheck, FileSignature, Eye, Timer } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      {/* Hero — one scroll, straight into the tool. The lookup is the app. */}
      <section className="flex flex-col gap-5 py-14 sm:py-20">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          For renters in India · powered by Arkiv
        </p>
        <h1 className="max-w-2xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
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
      </section>

      {/* How it works — 3 steps */}
      <section className="border-t border-border py-10" aria-label="How it works">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          How it works
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
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
            <li key={s.title} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-primary">
                <s.icon size={18} aria-hidden />
                <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-2 font-medium">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/record"
            className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground [@media(hover:hover)]:hover:bg-primary/90"
          >
            <FileSignature size={16} aria-hidden /> Record on Arkiv
          </Link>
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium [@media(hover:hover)]:hover:bg-muted"
          >
            <ShieldCheck size={16} aria-hidden className="text-primary" /> Watch the live ledger
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Bound the chain read — Tiramisu is a public testnet and the path to it
 *  can flap. The search form works by wallet address without the directory;
 *  past the bound we render it with an honest degraded note instead of an
 *  infinite skeleton. */
const DIRECTORY_BOUND_MS = 10_000;

async function DirectoryLookup() {
  await io();
  const directory = await Promise.race([
    listDirectory().catch(() => null),
    new Promise<null>((res) => setTimeout(() => res(null), DIRECTORY_BOUND_MS)),
  ]);
  return <LookupForm directory={directory} />;
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
