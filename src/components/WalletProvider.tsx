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
import { connectWallet, currentAccount, getProvider } from "@/lib/arkiv/browser";
import { CHAIN_ID } from "@/lib/arkiv/config";

type WalletCtx = {
  /** connected address on Tiramisu, or null */
  address: Address | null;
  /** true once we've checked for a silent reconnect */
  ready: boolean;
  /** wallet is on the wrong chain */
  wrongChain: boolean;
  connect: () => Promise<Address>;
  disconnect: () => void;
  error: string | null;
};

const Ctx = createContext<WalletCtx>({
  address: null,
  ready: false,
  wrongChain: false,
  connect: async () => "0x" as Address,
  disconnect: () => {},
  error: null,
});

export const useWallet = () => useContext(Ctx);

const TIRAMISU_HEX = `0x${CHAIN_ID.toString(16)}`;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [ready, setReady] = useState(false);
  const [wrongChain, setWrongChain] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const a = await currentAccount().catch(() => null);
      if (!live) return;
      if (a) {
        const eth = getProvider();
        const chain = (await eth?.request({ method: "eth_chainId" }).catch(() => null)) as
          | string
          | null;
        setWrongChain(!!chain && chain.toLowerCase() !== TIRAMISU_HEX.toLowerCase());
        setAddress(chain?.toLowerCase() === TIRAMISU_HEX.toLowerCase() ? a : a);
      }
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

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
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const a = await connectWallet();
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
    <Ctx.Provider value={{ address, ready, wrongChain, connect, disconnect, error }}>
      {children}
    </Ctx.Provider>
  );
}
