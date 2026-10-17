"use client";

import { useHeroSelection } from "./HeroSelection";
import { TOWER_LANDLORD } from "@/lib/arkiv/config";

/** Mobile/no-WebGL fallback image — swaps to the high-rise render when
 *  Skyline Towers is selected, matching the live 3D model swap. */
export function HeroBuildingImg() {
  const { selected } = useHeroSelection();
  const tower = selected?.toLowerCase() === TOWER_LANDLORD;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tower ? "/hero-tower.png" : "/hero-building.png"}
      alt="Clay-render apartment tower — the glowing unit is a signed deposit record"
      className="mx-auto lg:hidden"
    />
  );
}
