import { Suspense } from "react";
import { io } from "next/cache";
import { eq } from "@arkiv-network/sdk/query";
import { str } from "@arkiv-network/sdk/attr";
import { createReader } from "@/lib/arkiv/clients";
import { PROJECT } from "@/lib/arkiv/config";
import { LiveWatcher } from "@/components/LiveWatcher";
import { FeedList, type FeedRow } from "@/components/FeedList";
import { EmptyState, Skeleton } from "@/components/ui";

export default function FeedPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-medium">The live ledger</h1>
        <LiveWatcher landlord={null} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Every SafeStay entity on Tiramisu, newest first — served by the Arkiv event stream.
        Record an outcome and watch this page update without a refresh.
      </p>
      <Suspense fallback={<FeedSkeleton />}>
        <FeedRows />
      </Suspense>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-2" aria-busy>
      {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
    </div>
  );
}

async function FeedRows() {
  await io();
  const reader = createReader();
  const page = await reader
    .select({ key: true, creator: true, expiresAt: true, attributes: true, payload: true })
    .where(eq("project", str(PROJECT)))
    .limit(50)
    .fetch();

  const rows: FeedRow[] = page.entities
    .map((e) => {
      const a = e.attributes as Record<string, { type: string; value: unknown }>;
      const amount = (a.amount_returned_inr?.value ?? a.deposit_inr?.value) as bigint | undefined;
      return {
        key: e.key as string,
        creator: e.creator as string,
        type: a.entity_type?.value as string,
        city: (a.city?.value as string) ?? "",
        amount: amount?.toString(),
        outcome: a.outcome?.value as string | undefined,
        landlord: a.landlord_wallet?.value as string | undefined,
        createdAtMs: ((a.created_at?.value as bigint | undefined) ?? 0n).toString(),
      };
    })
    .sort((a, b) => (BigInt(b.createdAtMs) > BigInt(a.createdAtMs) ? 1 : -1));

  return rows.length === 0 ? (
    <div className="mt-6">
      <EmptyState
        title="No records yet"
        body="The ledger is empty — record an outcome and it will appear here within seconds."
      />
    </div>
  ) : (
    <FeedList rows={rows} />
  );
}
