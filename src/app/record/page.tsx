import { Suspense } from "react";
import { io } from "next/cache";
import { getOpenTermsForTenant } from "@/lib/arkiv/queries";
import { walletAddress } from "@/lib/arkiv/clients";
import { recordOutcomeAction, recordTermsAction } from "@/app/actions";
import { OutcomeForm } from "@/components/OutcomeForm";
import { TermsForm } from "@/components/TermsForm";
import { WalletFlow } from "@/components/WalletFlow";
import { ReadBoundary } from "@/components/ReadBoundary";
import { Badge, Skeleton } from "@/components/ui";
import { shortAddr } from "@/lib/format";

export default function RecordPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-medium">Write to Arkiv</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tenants record outcomes against landlord-signed terms; landlords sign the terms.
        With a wallet connected, <em>you</em> sign every entity yourself.
      </p>

      <WalletFlow />

      <details className="mt-8 rounded-lg border border-dashed border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground">
          No wallet? Demo mode — the server signs as two seeded wallets
        </summary>
        <div className="border-t border-border px-4 py-4">
          <p className="text-xs text-muted-foreground">
            Entities written here are real on Arkiv — but the creator is a seeded demo
            wallet, not you. Judges without a wallet can still exercise the full write path.
          </p>
          <ReadBoundary>
            <Suspense fallback={<RolesSkeleton />}>
              <Roles />
            </Suspense>
            <Suspense fallback={<Skeleton className="mt-6 h-96 w-full rounded-lg" />}>
              <DemoForms />
            </Suspense>
          </ReadBoundary>
        </div>
      </details>
    </div>
  );
}

async function Roles() {
  await io();
  const tenant = walletAddress("tenant");
  const landlord = walletAddress("landlord");
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Badge tone="primary">demo tenant {shortAddr(tenant)}</Badge>
      <Badge tone="primary">demo landlord {shortAddr(landlord)}</Badge>
    </div>
  );
}

/** Bound the chain read — a hung RPC shows the route error state instead of
 *  an infinite skeleton inside the demo panel. */
async function DemoForms() {
  await io();
  const tenant = walletAddress("tenant");
  const openTerms = await Promise.race([
    getOpenTermsForTenant(tenant),
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error("open terms read timed out")), 15_000),
    ),
  ]);
  return (
    <div className="mt-5 flex flex-col gap-8">
      <section>
        <h2 className="mb-3 font-medium">Record an outcome as demo tenant</h2>
        <OutcomeForm
          openTerms={openTerms}
          onSubmit={recordOutcomeAction}
          emptyTitle="No open terms for the demo tenant"
          emptyBody={`Wallet ${shortAddr(tenant)} has no unanswered deposit terms. An outcome can only be recorded against terms a landlord signed naming this wallet — that two-way link is what stops fabricated reviews. Sign new terms below first.`}
          signerNote={
            <>
              Demo signer <span className="font-mono">{shortAddr(tenant)}</span> — a real Arkiv
              entity, but the creator is the seeded wallet. One tx, two entities —{" "}
              <code className="font-mono">executeBatch</code>.
            </>
          }
        />
      </section>
      <section>
        <h2 className="mb-3 font-medium">Sign terms as demo landlord</h2>
        <TermsForm
          defaultTenant={tenant}
          onSubmit={recordTermsAction}
          signerNote={
            <>
              Signs as the seeded <span className="font-mono">Sunrise PG</span> wallet — the
              landlord’s demo identity on Tiramisu.
            </>
          }
        />
      </section>
    </div>
  );
}

function RolesSkeleton() {
  return (
    <div className="mt-2 flex gap-2" aria-busy>
      <Skeleton className="h-6 w-32 rounded-sm" />
      <Skeleton className="h-6 w-32 rounded-sm" />
    </div>
  );
}
