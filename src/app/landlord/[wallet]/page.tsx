import { Suspense } from "react";
import { notFound } from "next/navigation";
import { io } from "next/cache";
import { isAddress, type Address } from "viem";
import { getLandlordHistory, getProfile } from "@/lib/arkiv/queries";
import { HistoryView } from "@/components/HistoryView";
import { LiveWatcher } from "@/components/LiveWatcher";
import { Skeleton } from "@/components/ui";

export default async function LandlordPage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;
  if (!isAddress(wallet)) notFound();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Suspense fallback={<h1 className="text-xl font-semibold">Deposit history</h1>}>
          <LandlordTitle wallet={wallet} />
        </Suspense>
        <LiveWatcher landlord={wallet} />
      </div>
      <Suspense fallback={<HistorySkeleton />}>
        <History wallet={wallet} />
      </Suspense>
    </div>
  );
}

/** Bound every chain read — Tiramisu (or the path to it) can flap. A bounded
 *  timeout surfaces as an honest state instead of an infinite skeleton. */
const CHAIN_BOUND_MS = 15_000;

function bound<T>(p: Promise<T>, what: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`${what} didn't answer in ${CHAIN_BOUND_MS / 1000}s`)), CHAIN_BOUND_MS),
    ),
  ]);
}

async function LandlordTitle({ wallet }: { wallet: string }) {
  await io();
  const profile = await bound(getProfile(wallet as Address), "profile").catch(() => null);
  return (
    <h1 className="text-xl font-semibold">
      {profile?.name ? `${profile.name} — deposit history` : "Deposit history"}
    </h1>
  );
}

async function History({ wallet }: { wallet: string }) {
  await io();
  const history = await bound(getLandlordHistory(wallet as Address), "history");
  return <HistoryView h={history} />;
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-44 w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}
