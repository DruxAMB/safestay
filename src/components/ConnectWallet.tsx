"use client";

import { useState } from "react";
import { Wallet, LogOut, AlertTriangle } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { shortAddr } from "@/lib/format";

/** Header wallet connect — the real signing path. Connected = writes are
 *  signed by the user's own wallet on Tiramisu, not the demo keys. */
export function ConnectWallet() {
  const { address, ready, wrongChain, connect, disconnect, providers, walletId, select } = useWallet();
  const [busy, setBusy] = useState(false);

  if (!ready) {
    return <span className="inline-block h-9 w-24 animate-pulse rounded-md bg-muted" aria-hidden />;
  }

  if (address) {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 font-mono text-xs ${
            wrongChain ? "border-warn bg-warn-bg text-warn" : "border-border bg-card"
          }`}
          title={wrongChain ? "Wallet is on the wrong network — switch to Tiramisu" : address}
        >
          {wrongChain ? <AlertTriangle size={13} aria-hidden /> : <Wallet size={13} aria-hidden />}
          {wrongChain ? "wrong net" : shortAddr(address)}
        </span>
        <button
          type="button"
          onClick={disconnect}
          aria-label="Disconnect wallet"
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted-foreground [@media(hover:hover)]:hover:bg-muted"
        >
          <LogOut size={14} aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {providers.length > 1 && (
        <select
          aria-label="Choose wallet"
          value={walletId ?? ""}
          onChange={(e) => select(e.target.value || null)}
          className="h-9 max-w-28 rounded-md border border-border bg-card px-1.5 text-xs"
        >
          <option value="">Default wallet</option>
          {providers.map((p) => (
            <option key={p.info.uuid} value={p.info.uuid}>
              {p.info.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await connect(walletId ?? undefined);
          } catch {
            /* error shown via useWallet().error / provider UX */
          } finally {
            setBusy(false);
          }
        }}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50 [@media(hover:hover)]:hover:bg-primary/90"
      >
        <Wallet size={13} aria-hidden />
        {busy ? "Connecting…" : "Connect wallet"}
      </button>
    </span>
  );
}
