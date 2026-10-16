import { Suspense } from "react";
import { io } from "next/cache";
import { explorerAddressUrl } from "@/lib/arkiv/config";
import { listDirectory } from "@/lib/arkiv/queries";
import { Card, Skeleton } from "@/components/ui";
import { ExternalLink } from "lucide-react";

export const metadata = { title: "How SafeStay uses Arkiv" };

const QUERIES = [
  {
    name: "Landlord history (the lookup)",
    expr: "project='safestay_v1' AND entity_type='deposit_outcome' AND landlord_wallet=<addr>",
    why: "Open scope on purpose — any tenant may review. Trust comes from the two-way link, not an allowlist.",
  },
  {
    name: "Signed terms for verification",
    expr: "project='safestay_v1' AND entity_type='deposit_terms' AND $creator=<landlord>",
    why: "The landlord's own signature is the provenance — $creator can't be forged.",
  },
  {
    name: "Open terms for a tenant",
    expr: "project='safestay_v1' AND entity_type='deposit_terms' AND tenant_wallet=<addr>",
    why: "A tenant can only answer terms that name them.",
  },
  {
    name: "Evidence for an outcome",
    expr: "project='safestay_v1' AND entity_type='evidence_log' AND outcome_key=<key>",
    why: "key-typed attributes join records without a foreign-key layer.",
  },
  {
    name: "Landlord directory",
    expr: "project='safestay_v1' AND entity_type IN ('deposit_terms','landlord_profile')",
    why: "Directory membership = every wallet that signed terms; display names come only from profiles that wallet signed itself.",
  },
];

async function CreatorDirectory() {
  await io();
  const directory = await listDirectory();
  if (directory.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        No landlords have signed terms yet — the directory populates itself from chain.
      </p>
    );
  }
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {directory.map((l) => (
        <li key={l.address}>
          <a href={explorerAddressUrl(l.address)} target="_blank" rel="noopener noreferrer"
             className="inline-flex flex-wrap items-center gap-2 font-mono text-sm text-primary underline-offset-2 [@media(hover:hover)]:hover:underline">
            {l.name ? `${l.name} · ` : ""}{l.address} · {l.termsCount} terms <ExternalLink size={12} aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">How SafeStay uses Arkiv</h1>
      <p className="mt-3 text-muted-foreground">
        SafeStay is a deposit-truth registry for Indian renters. Deposits and PG advances
        of ₹20k–₹1L+ change hands with no verifiable history — this app puts the truth on
        a public database nobody controls.
      </p>

      <section className="mt-8">
        <h2 className="font-semibold">The trust model — why fake reviews can’t exist</h2>
        <div className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            A landlord signs <code className="font-mono">deposit_terms</code> naming a tenant
            wallet. When the tenancy ends, that tenant signs a{" "}
            <code className="font-mono">deposit_outcome</code> referencing the terms — and the
            app only marks it <em>verified</em> when the referenced terms name the reviewer back.
          </p>
          <p>
            A fabricated review would need a colluding landlord signature — which incriminates
            the landlord. Filtering runs on <code className="font-mono">$creator</code>, Arkiv’s
            immutable provenance field, never on a writable attribute.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Why Arkiv and not Postgres / IPFS / an API</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li><strong>Postgres</strong> — whoever runs the site can edit or delete any record. The whole point is that nobody can.</li>
          <li><strong>IPFS</strong> — content-addressed but not queryable: “give me every outcome about this wallet” has no answer.</li>
          <li><strong>A custom API</strong> — trust re-enters through the operator. Arkiv makes the records public, signed, typed and expiring by construction.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Arkiv features → what you see</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li><code className="font-mono">$creator</code> + cross-referenced terms → “verified link” badges.</li>
          <li>Typed attributes (<code className="font-mono">addr</code>, <code className="font-mono">u256</code>, <code className="font-mono">key</code>, <code className="font-mono">u64</code>) → the exact queries below, no server-side sort.</li>
          <li><code className="font-mono">executeBatch</code> → outcome + evidence hash land in <em>one atomic transaction</em>.</li>
          <li>Entity Expiration → every record shows a live expiry; truth outlives the app, not the person.</li>
          <li>Lifetime Extension → landlords can renew terms while a tenancy is active.</li>
          <li><code className="font-mono">watchEntityEvents</code> over WebSocket → the history page and live feed update with no refresh.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Exact queries</h2>
        <div className="mt-3 flex flex-col gap-3">
          {QUERIES.map((q) => (
            <Card key={q.name} className="p-4">
              <p className="text-sm font-medium">{q.name}</p>
              <code className="mt-1 block break-all rounded bg-muted px-2 py-1 font-mono text-xs">{q.expr}</code>
              <p className="mt-1.5 text-xs text-muted-foreground">{q.why}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Creator wallets — read live from Arkiv</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every wallet below signed at least one <code className="font-mono">deposit_terms</code>{" "}
          entity — this list is a live query, not a config file. Seeded identities are synthetic
          demo businesses; names appear only where the wallet signed its own{" "}
          <code className="font-mono">landlord_profile</code>.
        </p>
        <Suspense fallback={
          <div aria-busy className="mt-3 flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4 rounded" />
            <Skeleton className="h-5 w-2/3 rounded" />
          </div>
        }>
          <CreatorDirectory />
        </Suspense>
      </section>

      <section className="mt-8 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Kept off Arkiv, deliberately</h2>
        <p className="mt-2">
          Photos, names, phone numbers and exact addresses never touch the chain. Evidence is a
          SHA-256 hash only — the file stays with the tenant. See{" "}
          <code className="font-mono">/arkiv/schema.md</code> and{" "}
          <code className="font-mono">/arkiv/friction.md</code> in the repository.
        </p>
      </section>
    </div>
  );
}
