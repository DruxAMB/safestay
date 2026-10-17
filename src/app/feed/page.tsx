import { Suspense } from "react";
import { io } from "next/cache";
import { eq } from "@arkiv-network/sdk/query";
import { str } from "@arkiv-network/sdk/attr";
import { createReader } from "@/lib/arkiv/clients";
import { PROJECT, OUTCOME_LABEL, explorerEntityUrl } from "@/lib/arkiv/config";
import { LiveWatcher } from "@/components/LiveWatcher";
import { Card, Badge, EmptyState, Skeleton } from "@/components/ui";
import { shortAddr, shortKey, inr } from "@/lib/format";
import { ExternalLink } from "lucide-react";

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

  const rows = page.entities.map((e) => {
    const a = e.attributes as Record<string, { type: string; value: unknown }>;
    const type = a.entity_type?.value as string;
    return {
      key: e.key as string,
      creator: e.creator as string,
      type,
      city: (a.city?.value as string) ?? "",
      amount: (a.amount_returned_inr?.value ?? a.deposit_inr?.value) as bigint | undefined,
      outcome: a.outcome?.value as string | undefined,
    };
  });

  return (
    <>
      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No records yet"
            body="The ledger is empty — record an outcome and it will appear here within seconds."
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.key}>
              <Card className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <Badge tone={r.type === "deposit_outcome" ? "warn" : r.type === "deposit_terms" ? "primary" : "muted"}>
                  {r.type === "deposit_outcome" ? "outcome" : r.type === "deposit_terms" ? "terms" : "evidence"}
                </Badge>
                <span className="text-sm">
                  {r.type === "deposit_outcome" && r.outcome
                    ? OUTCOME_LABEL[r.outcome as keyof typeof OUTCOME_LABEL]
                    : r.type}
                  {r.amount !== undefined ? ` · ${inr(r.amount)}` : ""}
                  {r.city ? ` · ${r.city}` : ""}
                </span>
                <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{shortAddr(r.creator)}</span>
                  <a href={explorerEntityUrl(r.key)} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 font-mono text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
                    {shortKey(r.key)} <ExternalLink size={11} aria-hidden />
                  </a>
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
