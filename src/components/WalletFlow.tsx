"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { isAddress } from "viem";
import type { Address } from "viem";
import { useWallet } from "./WalletProvider";
import { OutcomeForm } from "./OutcomeForm";
import { TermsForm } from "./TermsForm";
import { Badge, Button, Card, Skeleton } from "./ui";
import {
  browserExtendTerms,
  browserMyTerms,
  browserOpenTermsFor,
  browserRecordOutcome,
  browserSignTerms,
  browserSigner,
} from "@/lib/arkiv/browser";
import type { ActionResult } from "@/app/actions";
import type { TermsDto } from "@/lib/arkiv/schema";
import type { Outcome } from "@/lib/arkiv/config";
import { explorerTxUrl, explorerEntityUrl } from "@/lib/arkiv/config";
import { inr, shortAddr } from "@/lib/format";
import { ExternalLink, Loader2 } from "lucide-react";

type MyTerms = Awaited<ReturnType<typeof browserMyTerms>>[number];

/** The real signing path: connected wallet → sign as tenant or landlord.
 *  Not connected → this renders the demo panel instead (see record page). */
export function WalletFlow() {
  const { address, ready, connect, error } = useWallet();
  const [role, setRole] = useState<"tenant" | "landlord">("tenant");
  const [myTerms, setMyTerms] = useState<MyTerms[] | null>(null);
  const [openTerms, setOpenTerms] = useState<TermsDto[] | null>(null);
  const [loading, start] = useTransition();

  const refresh = useCallback(() => {
    if (!address) return;
    start(async () => {
      const [open, mine] = await Promise.all([
        browserOpenTermsFor(address),
        browserMyTerms(address),
      ]);
      setOpenTerms(
        open.map((t) => ({
          entityKey: t.termsKey,
          creator: t.creator,
          tenant: address,
          depositInr: t.depositInr,
          city: t.city,
          propertyLabel: t.label,
          createdAtMs: "0",
          expiresAtBlock: "0",
          displayLabel: t.label,
        })),
      );
      setMyTerms(mine);
    });
  }, [address]);

  useEffect(() => {
    if (address) refresh();
  }, [address, refresh]);

  if (!ready) {
    return <Skeleton className="mt-6 h-40 w-full rounded-lg" aria-busy />;
  }

  if (!address) {
    return (
      <Card className="mt-6 p-5">
        <h2 className="font-semibold">Sign with your own wallet</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Connect an EIP-1193 wallet (MetaMask etc.) and SafeStay will switch it to Tiramisu.
          Every entity you create is signed by <em>your</em> address — the creator provenance
          is the trust model.
        </p>
        <Button className="mt-4" onClick={() => void connect().catch(() => {})}>
          Connect wallet to sign
        </Button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">{error}</p>
        )}
      </Card>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-sm">
        <Badge tone="primary">signed in: {shortAddr(address)}</Badge>
        <div className="ml-auto flex gap-1" role="tablist" aria-label="Signing role">
          {(["tenant", "landlord"] as const).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={role === r}
              onClick={() => setRole(r)}
              className={`min-h-10 rounded-md px-3 text-sm font-medium ${
                role === r ? "bg-primary text-primary-foreground" : "text-muted-foreground [@media(hover:hover)]:hover:bg-muted"
              }`}
            >
              {r === "tenant" ? "Record an outcome" : "Sign terms"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {loading || openTerms === null || myTerms === null ? (
          <div aria-busy className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : role === "tenant" ? (
          <OutcomeForm
            openTerms={openTerms}
            emptyTitle="No terms name your wallet"
            emptyBody="A landlord must sign deposit_terms naming your address before you can record an outcome. To try it solo: switch to the landlord tab and sign terms naming your own wallet."
            signerNote={<>Signed by your wallet <span className="font-mono">{shortAddr(address)}</span> — you are the on-chain creator.</>}
            onSubmit={async (fd) => walletOutcomeSubmit(address, fd)}
          />
        ) : (
          <LandlordTab me={address} myTerms={myTerms} onChanged={refresh} />
        )}
      </div>
    </div>
  );
}

async function walletOutcomeSubmit(address: Address, fd: FormData): Promise<ActionResult> {
  try {
    const res = await browserRecordOutcome({
      signer: browserSigner(address),
      outcomeId: String(fd.get("outcomeId")),
      termsKey: fd.get("termsKey") as `0x${string}`,
      outcome: fd.get("outcome") as Outcome,
      amountReturnedInr: BigInt(String(fd.get("amountReturnedInr") ?? "0")),
      comment: String(fd.get("comment") ?? ""),
      evidence: fd.get("evidenceSha")
        ? {
            sha256: fd.get("evidenceSha") as `0x${string}`,
            kind: (fd.get("evidenceKind") as "photo" | "chat" | "doc") ?? "photo",
            filenameHint: String(fd.get("evidenceName") ?? "evidence"),
            byteSize: Number(fd.get("evidenceSize") ?? 0),
          }
        : undefined,
    });
    return { ok: true, txHash: res.txHash, entityKey: res.entityKey, extra: res.evidenceKey ?? undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "wallet write failed" };
  }
}

function LandlordTab({ me, myTerms, onChanged }: { me: Address; myTerms: MyTerms[]; onChanged: () => void }) {
  const [extending, setExtending] = useState<string | null>(null);
  const [extResult, setExtResult] = useState<{ key: string; tx?: string; err?: string } | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <TermsForm
        defaultTenant={me}
        showProfileName
        signerNote={<>Signed by your wallet — you are the landlord’s on-chain creator. A display name writes a <code className="font-mono">landlord_profile</code> in the same tx.</>}
        onSubmit={async (fd) => walletTermsSubmit(me, fd)}
      />

      <section aria-label="My signed terms">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your signed terms ({myTerms.length})
        </h3>
        {myTerms.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None yet — sign your first terms above.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {myTerms.map((t) => (
              <li key={t.key} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm">
                <span className="font-medium">{t.label || shortAddr(t.key)}</span>
                <span className="text-muted-foreground">
                  {inr(t.depositInr)} · {t.city} · tenant {shortAddr(t.tenant)}
                </span>
                <span className="ml-auto inline-flex items-center gap-2">
                  <a href={explorerEntityUrl(t.key)} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 font-mono text-xs text-primary underline-offset-2 [@media(hover:hover)]:hover:underline">
                    {shortAddr(t.key)} <ExternalLink size={11} aria-hidden />
                  </a>
                  <Button
                    variant="secondary"
                    disabled={extending === t.key}
                    onClick={async () => {
                      setExtending(t.key);
                      setExtResult(null);
                      try {
                        const r = await browserExtendTerms(
                          browserSigner(me), t.key, BigInt(t.expiresAtBlock),
                        );
                        setExtResult({ key: t.key, tx: r.txHash });
                        onChanged();
                      } catch (e) {
                        setExtResult({ key: t.key, err: e instanceof Error ? e.message : "extend failed" });
                      } finally {
                        setExtending(null);
                      }
                    }}
                  >
                    {extending === t.key && <Loader2 size={13} className="animate-spin" aria-hidden />}
                    +12mo
                  </Button>
                </span>
                {extResult?.key === t.key && (
                  <p className={`w-full text-xs ${extResult.err ? "text-danger" : "text-success"}`} role="status">
                    {extResult.err ?? (
                      <>extended ·{" "}
                        <a href={explorerTxUrl(extResult.tx!)} target="_blank" rel="noopener noreferrer"
                           className="underline underline-offset-2">
                          {extResult.tx!.slice(0, 14)}…
                        </a>
                      </>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function walletTermsSubmit(me: Address, fd: FormData): Promise<ActionResult> {
  const tenant = String(fd.get("tenant") ?? "");
  if (!isAddress(tenant)) return { ok: false, error: "invalid tenant wallet" };
  try {
    const displayName = String(fd.get("displayName") ?? "").trim();
    const city = String(fd.get("city") ?? "");
    const res = await browserSignTerms({
      signer: browserSigner(me),
      termsId: String(fd.get("termsId")),
      tenant: tenant as Address,
      depositInr: BigInt(String(fd.get("depositInr") ?? "0")),
      city,
      propertyLabel: String(fd.get("propertyLabel") ?? ""),
      moveIn: String(fd.get("moveIn") ?? "2026-10"),
      durationMonths: Number(fd.get("durationMonths") ?? 12),
      note: String(fd.get("note") ?? ""),
      profile: displayName ? { name: displayName, city } : undefined,
    });
    return { ok: true, txHash: res.txHash, entityKey: res.entityKey };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "wallet write failed" };
  }
}
