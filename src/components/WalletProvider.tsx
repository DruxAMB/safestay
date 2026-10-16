"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Address } from "viem";
import {
  connectWallet,
  currentAccount,
  discoveredWallets,
  getProvider,
  listenForWallets,
  selectWallet,
  selectedWalletUuid,
  type Eip6963Detail,
} from "@/lib/arkiv/browser";
import { CHAIN_ID } from "@/lib/arkiv/config";

type WalletCtx = {
  /** connected address on Tiramisu, or null */
  address: Address | null;
  /** true once we've checked for a silent reconnect */
  ready: boolean;
  /** wallet is on the wrong chain */
  wrongChain: boolean;
  connect: (uuid?: string) => Promise<Address>;
  disconnect: () => void;
  error: string | null;
  /** EIP-6963 wallets that announced themselves (empty = no multi-wallet) */
  providers: Eip6963Detail[];
  /** uuid of the wallet requests route to; null = browser default */
  walletId: string | null;
  select: (uuid: string | null) => void;
};

const Ctx = createContext<WalletCtx>({
  address: null,
  ready: false,
  wrongChain: false,
  connect: async () => "0x" as Address,
  disconnect: () => {},
  error: null,
  providers: [],
  walletId: null,
  select: () => {},
});

export const useWallet = () => useContext(Ctx);

const TIRAMISU_HEX = `0x${CHAIN_ID.toString(16)}`;

/** Wallets can hang a request instead of rejecting it (locked vault, broken
 *  extension internals). Bound every provider call — a hung eth_accounts must
 *  not leave the UI in a perpetual "checking" state. */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((res) => setTimeout(() => res(fallback), ms)),
  ]);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [ready, setReady] = useState(false);
  const [wrongChain, setWrongChain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Eip6963Detail[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);

  useEffect(() => {
    setWalletId(selectedWalletUuid());
    return listenForWallets(() => setProviders(discoveredWallets()));
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      // let EIP-6963 announcements land so a stored wallet selection resolves
      // to its real provider before we probe it
      await new Promise((r) => setTimeout(r, 300));
      const a = await withTimeout(currentAccount(), 2500, null);
      if (!live) return;
      if (a) {
        const eth = getProvider();
        const chain = (await withTimeout(
          eth?.request({ method: "eth_chainId" }) ?? Promise.resolve(null),
          1500,
          null,
        )) as string | null;
        setWrongChain(!!chain && chain.toLowerCase() !== TIRAMISU_HEX.toLowerCase());
        setAddress(a);
      }
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  // Listeners attach to the SELECTED provider — reruns when the user picks
  // a different wallet, so accountsChanged comes from the wallet in use.
  useEffect(() => {
    const eth = getProvider();
    if (!eth?.on) return;
    const onAccounts = (accounts: unknown) => {
      const list = accounts as Address[];
      setAddress(list[0] ?? null);
    };
    const onChain = (chainId: unknown) => {
      setWrongChain(
        typeof chainId === "string" && chainId.toLowerCase() !== TIRAMISU_HEX.toLowerCase(),
      );
    };
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [walletId]);

  const select = useCallback((uuid: string | null) => {
    selectWallet(uuid);
    setWalletId(uuid);
    setAddress(null);
    setWrongChain(false);
  }, []);

  const connect = useCallback(async (uuid?: string) => {
    setError(null);
    if (uuid !== undefined) {
      selectWallet(uuid);
      setWalletId(uuid);
    }
    try {
      // Generous bound — the wallet shows its own unlock/approve UI, so a
      // legit approval can take a while. A broken extension must still end
      // the "Connecting…" state eventually.
      const a = await Promise.race([
        connectWallet(),
        new Promise<never>((_, rej) =>
          setTimeout(
            () => rej(new Error("Wallet didn't respond — check that it's unlocked, then retry.")),
            120_000,
          ),
        ),
      ]);
      setAddress(a);
      setWrongChain(false);
      return a;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "wallet connect failed";
      setError(msg);
      throw e;
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  return (
    <Ctx.Provider
      value={{ address, ready, wrongChain, connect, disconnect, error, providers, walletId, select }}
    >
      {children}
    </Ctx.Provider>
  );
}
