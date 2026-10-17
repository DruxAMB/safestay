"use client";

import { useState } from "react";
import { Wallet, LogOut, AlertTriangle } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { WalletPicker } from "./WalletPicker";
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
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground [@media(hover:hover)]:hover:bg-primary/90"
      >
        <Wallet size={13} aria-hidden />
        Connect wallet
      </button>
      <WalletPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
