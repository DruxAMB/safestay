"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet, LogOut, AlertTriangle } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { WalletPicker } from "./WalletPicker";
import { WalletAvatar } from "./WalletAvatar";
import { useToast } from "./Toaster";
import { shortAddr } from "@/lib/format";

/** Header wallet connect — the real signing path. Connected = writes are
 *  signed by the user's own wallet on Tiramisu, not the demo keys. */
export function ConnectWallet() {
  const { address, ready, wrongChain, disconnect, error } = useWallet();
  const [pickerOpen, setPickerOpen] = useState(false);
  const t = useToast();
  // Toast wallet state transitions once each — dedupe by a stable key so a
  // render loop can't re-announce, but account switches still do.
  const lastToast = useRef("");
  const prevAddr = useRef<string | null>(null);
  useEffect(() => {
    const key = address
      ? wrongChain ? `wrong:${address}` : `addr:${address}`
      : error ? `err:${error}` : "";
    if (key && key !== lastToast.current) {
      lastToast.current = key;
      if (address && wrongChain)
        t.warn("Wrong network", "Switch your wallet to Tiramisu to sign records.");
      else if (address)
        // Same address coming back after a wrong-chain warning = they switched
        // networks, they didn't connect fresh — say which happened.
        t.success(prevAddr.current === address ? "Back on Tiramisu" : "Wallet connected",
          shortAddr(address));
      else if (error)
        t.danger("Wallet connection failed",
          error.length > 140 ? `${error.slice(0, 137)}…` : error);
    }
    prevAddr.current = address;
  }, [address, wrongChain, error, t]);

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
          onClick={() => {
            disconnect();
            t.info("Wallet disconnected");
          }}
          aria-label="Disconnect wallet"
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted-foreground transition-colors [@media(hover:hover)]:hover:bg-foreground/5 [@media(hover:hover)]:hover:text-foreground"
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
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors [@media(hover:hover)]:hover:bg-primary/90"
        aria-label="Connect wallet"
      >
        <Wallet size={13} aria-hidden />
        <span className="hidden sm:inline">Connect wallet</span>
      </button>
      <WalletPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
