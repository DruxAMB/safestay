"use client";

import { createContext, useContext, useState } from "react";

/** Shared hero state: which landlord wallet is selected from the directory.
 *  Drives the dossier specimen swap and the 3D building's glowing floor.
 *  Renders no DOM of its own — children pass straight through, so the
 *  provider can wrap the hero section without affecting layout or the
 *  absolutely-positioned canvas. Default value is a no-op so components
 *  used outside the hero degrade gracefully. */
const SelectionCtx = createContext<{
  selected: string | null;
  select: (address: string | null) => void;
}>({ selected: null, select: () => {} });

export function HeroSelection({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <SelectionCtx.Provider value={{ selected, select: setSelected }}>
      {children}
    </SelectionCtx.Provider>
  );
}

export function useHeroSelection() {
  return useContext(SelectionCtx);
}
