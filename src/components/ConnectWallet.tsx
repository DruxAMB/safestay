"use client";

import { useState } from "react";
import { Wallet, LogOut, AlertTriangle } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { WalletPicker } from "./WalletPicker";
import { WalletAvatar } from "./WalletAvatar";
import { shortAddr } from "@/lib/format";

/** Header wallet connect — the real signing path. Connected = writes are
 *  signed by the user's own wallet on Tiramisu, not the demo keys. */
export function ConnectWallet() {
  const { address, ready, wrongChain, disconnect } = useWallet();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!ready) {
    return <span className="inline-block h-9 w-24 animate-pulse rounded-md bg-muted" aria-hidden />;
  }

  if (address) {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 font-mono text-xs ${
            wrongChain ? "border-warn bg-warn-bg text-warn" : "border-border bg-card text-foreground"
          }`}
          title={wrongChain ? "Wallet is on the wrong network — switch to Tiramisu" : address}
        >
          {wrongChain ? (
            <AlertTriangle size={13} aria-hidden />
          ) : (
            <WalletAvatar address={address} size={20} />
          )}
          {wrongChain ? "wrong net" : shortAddr(address)}
        </span>
        <button
          type="button"
          onClick={disconnect}
          aria-label="Disconnect wallet"
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-text-inverse-muted [@media(hover:hover)]:hover:bg-white/5 [@media(hover:hover)]:hover:text-text-inverse"
        >
          <LogOut size={14} aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-medium text-primary-foreground [@media(hover:hover)]:hover:bg-primary/90"
        aria-label="Connect wallet"
      >
        <Wallet size={13} aria-hidden />
        <span className="hidden sm:inline">Connect wallet</span>
      </button>
      <WalletPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
