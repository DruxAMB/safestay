import { Suspense } from "react";
import { io } from "next/cache";
import { getOpenTermsForTenant } from "@/lib/arkiv/queries";
import { walletAddress } from "@/lib/arkiv/clients";
import { RecordForm } from "@/components/RecordForm";
import { Badge, Skeleton } from "@/components/ui";
import { shortAddr } from "@/lib/format";

export default function RecordPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-semibold">Record a deposit outcome</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Demo mode — this app signs as two seeded wallets so judges can write real Arkiv
        entities without a wallet of their own:
      </p>
      <Suspense fallback={<RolesSkeleton />}>
        <Roles />
      </Suspense>
      <Suspense fallback={<Skeleton className="mt-6 h-96 w-full rounded-lg" />}>
        <Form />
      </Suspense>
    </div>
  );
}

async function Roles() {
  await io();
  const tenant = walletAddress("tenant");
  const landlord = walletAddress("landlord");
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Badge tone="primary">tenant {shortAddr(tenant)}</Badge>
      <Badge tone="primary">landlord {shortAddr(landlord)}</Badge>
    </div>
  );
}

async function Form() {
  await io();
  const tenant = walletAddress("tenant");
  const openTerms = await getOpenTermsForTenant(tenant);
  return (
    <div className="mt-6">
      <RecordForm openTerms={openTerms} tenant={tenant} />
    </div>
  );
}

function RolesSkeleton() {
  return (
    <div className="mt-2 flex gap-2" aria-busy>
      <Skeleton className="h-6 w-32 rounded-full" />
      <Skeleton className="h-6 w-32 rounded-full" />
    </div>
  );
}
