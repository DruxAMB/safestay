import { Suspense } from "react";
import { notFound } from "next/navigation";
import { io } from "next/cache";
import { isAddress, type Address } from "viem";
import { getLandlordHistory } from "@/lib/arkiv/queries";
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
        <h1 className="text-xl font-semibold">Deposit history</h1>
        <LiveWatcher landlord={wallet} />
      </div>
      <Suspense fallback={<HistorySkeleton />}>
        <History wallet={wallet} />
      </Suspense>
    </div>
  );
}

async function History({ wallet }: { wallet: string }) {
  await io();
  const history = await getLandlordHistory(wallet as Address);
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
