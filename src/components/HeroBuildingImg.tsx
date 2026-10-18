"use client";

import { useHeroSelection } from "./HeroSelection";
import { heroImgFor } from "@/lib/arkiv/config";

/** Mobile/no-WebGL fallback image — swaps to the high-rise or terraced
 *  render when that landlord is selected, matching the live 3D model swap. */
export function HeroBuildingImg() {
  const { selected } = useHeroSelection();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={heroImgFor(selected)}
      alt="Clay-render apartment tower — the glowing unit is a signed deposit record"
      className="mx-auto lg:hidden"
    />
  );
}
