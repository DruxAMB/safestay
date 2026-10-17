"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Wallet, X } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { getProvider, type Eip6963Detail } from "@/lib/arkiv/browser";

/** EIP-6963 wallet picker modal. Every installed wallet announces itself;
 *  the user picks which one answers — routes around a broken extension
 *  that won the window.ethereum race. */
export function WalletPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { providers, connect, address, error } = useWallet();
  const [connectingUid, setConnectingUid] = useState<string | null>(null);
  const hasDefault = typeof window !== "undefined" && !!getProvider();

  // a connection can land while the picker is open — a reconnect racing the
  // click that opened it, or a connect elsewhere
  useEffect(() => {
    if (open && address) onClose();
  }, [open, address, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const pick = async (uuid: string | null) => {
    setConnectingUid(uuid ?? "default");
    try {
      await connect(uuid ?? undefined);
      onClose();
    } catch {
      /* error surfaces via context below */
    } finally {
      setConnectingUid(null);
    }
  };

  // Portal to body — the header's backdrop-blur makes it a containing block
  // for position:fixed children, which would clip this modal inside the nav.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect a wallet"
        className="pop-in w-full rounded-t-2xl border border-border bg-card p-5 sm:max-w-sm sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Connect a wallet</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted-foreground transition-colors [@media(hover:hover)]:hover:bg-muted"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Entities you create are signed by <em>your</em> address on Tiramisu —
          the creator provenance is the trust model.
        </p>

        {connectingUid && (
          <div className="mt-3 flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            continue in your wallet
            <span className="h-px flex-1 bg-border" />
          </div>
        )}

        <div className="mt-3 flex flex-col gap-1">
          {providers.map((p) => (
            <WalletRow
              key={p.info.uuid}
              wallet={p}
              busy={connectingUid === p.info.uuid}
              disabled={connectingUid !== null}
              onPick={() => void pick(p.info.uuid)}
            />
          ))}
          {hasDefault && (
            <button
              type="button"
              disabled={connectingUid !== null}
              onClick={() => void pick(null)}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted"
            >
              <Wallet size={18} aria-hidden className="text-muted-foreground" />
              Browser default wallet
              {connectingUid === "default" && (
                <span className="ml-auto h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
              )}
            </button>
          )}
          {providers.length === 0 && !hasDefault && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No wallet detected in this browser. Install MetaMask or another
              EIP-1193 wallet, then reload.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">{error}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}

function WalletRow({
  wallet,
  busy,
  disabled,
  onPick,
}: {
  wallet: Eip6963Detail;
  busy: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted"
    >
      {wallet.info.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={wallet.info.icon} alt="" width={20} height={20} className="rounded" />
      ) : (
        <Wallet size={18} aria-hidden className="text-muted-foreground" />
      )}
      {wallet.info.name}
      {busy && (
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          continue in wallet
        </span>
      )}
    </button>
  );
}
