"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPublicClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { webSocket } from "viem";
import { PROJECT, TIRAMISU_WS } from "@/lib/arkiv/config";
import {
  attrAddr,
  attrBig,
  attrStr,
  type Attrs,
  type TermsDto,
} from "@/lib/arkiv/schema";

/** Shared hero state: which landlord wallet is selected (directory chips
 *  OR clicking a lit unit in the 3D building), the snapshot terms the
 *  dossier and scene both read, and any deposit_terms that land live over
 *  the Arkiv WebSocket while the page is open. Renders no DOM of its own —
 *  children pass straight through, so the provider can wrap the hero
 *  section without affecting layout or the absolutely-positioned canvas.
 *  Default value is a no-op so components used outside it degrade
 *  gracefully. */
type HeroCtx = {
  selected: string | null;
  select: (address: string | null) => void;
  terms: TermsDto[];
  live: TermsDto[];
  registerTerms: (terms: TermsDto[]) => void;
};

const SelectionCtx = createContext<HeroCtx>({
  selected: null,
  select: () => {},
  terms: [],
  live: [],
  registerTerms: () => {},
});

export function HeroSelection({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [terms, setTerms] = useState<TermsDto[]>([]);
  const [live, setLive] = useState<TermsDto[]>([]);
  // entityKeys already represented (snapshot + live) so a websocket event
  // can never light the same record twice.
  const known = useRef(new Set<string>());

  const registerTerms = useCallback((t: TermsDto[]) => {
    for (const x of t) known.current.add(x.entityKey.toLowerCase());
    setTerms((prev) => (prev.length ? prev : t));
  }, []);

  // Live ignition feed — a real deposit_terms landing mid-session lights a
  // fresh unit in the tower and ticks the dossier. Read-only; degrades
  // silently if the public WS is unreachable.
  useEffect(() => {
    let unwatch: (() => void) | undefined;
    let dead = false;
    const client = createPublicClient({
      chain: tiramisu,
      transport: webSocket(TIRAMISU_WS),
    });
    const onCandidate = async (entityKey: string) => {
      try {
        const e = await client.getEntity(entityKey as `0x${string}`);
        const attrs = e.attributes as Attrs | undefined;
        if (!attrs) return;
        if (attrStr(attrs, "project") !== PROJECT) return;
        if (attrStr(attrs, "entity_type") !== "deposit_terms") return;
        const k = entityKey.toLowerCase();
        if (known.current.has(k)) return;
        known.current.add(k);
        const dto: TermsDto = {
          entityKey,
          creator: (e as { creator?: string }).creator ?? "",
          tenant: attrAddr(attrs, "tenant_wallet") ?? "",
          depositInr: (attrBig(attrs, "deposit_inr") ?? 0n).toString(),
          city: attrStr(attrs, "city") ?? "",
          propertyLabel: attrStr(attrs, "property_label") ?? "",
          createdAtMs: (attrBig(attrs, "created_at") ?? BigInt(Date.now())).toString(),
          expiresAtBlock: ((e as { expiresAt?: bigint }).expiresAt ?? 0n).toString(),
          displayLabel: "",
        };
        if (!dead) setLive((prev) => [...prev, dto]);
      } catch {
        /* entity vanished or read failed — skip */
      }
    };
    try {
      unwatch = client.watchEntityEvents({
        onEntityCreated: (event) => {
          const k = (event as { entityKey?: string }).entityKey;
          if (k) void onCandidate(k);
        },
        onError: () => {},
      });
    } catch {
      /* no live feed — the page still fully works */
    }
    return () => {
      dead = true;
      unwatch?.();
    };
  }, []);

  return (
    <SelectionCtx.Provider
      value={{ selected, select: setSelected, terms, live, registerTerms }}
    >
      {children}
    </SelectionCtx.Provider>
  );
}

export function useHeroSelection() {
  return useContext(SelectionCtx);
}
