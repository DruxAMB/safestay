import type { CSSProperties } from "react";

/** The loading glyph: five slabs restructuring between the app's two
 *  silhouettes (Sunrise L-block ⇄ Skyline tower), bottom floor first.
 *  Per-floor --dx/--sx vars feed the lb-morph keyframes in globals.css;
 *  animation-delay staggers the wave. Reduced-motion flattens to a
 *  static building. Server-safe — no hooks. */
const FLOORS = [
  { dx: 0, sx: 1.9 }, // podium slabs widen left → L foot
  { dx: 0, sx: 1.9 },
  { dx: 6, sx: 1 }, // upper slabs step right → setback profile
  { dx: 12, sx: 1 },
  { dx: 18, sx: 1 },
];

export function BuildingLoader({
  size = 128,
  caption = "Reading from Arkiv…",
}: {
  size?: number;
  caption?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
        <rect x="10" y="105" width="100" height="3" rx="1.5" fill="#c9c3ba" />
        {FLOORS.map((f, i) => (
          <g
            key={i}
            className="lb-floor"
            style={
              {
                "--dx": `${f.dx}px`,
                "--sx": `${f.sx}`,
                animationDelay: `${i * 90}ms`,
              } as CSSProperties
            }
          >
            <rect x="42" y={90 - 16 * i} width="36" height="14" rx="1.5" fill="#0c0a08" />
            {[7, 15, 23].map((wx) => (
              <rect
                key={wx}
                x={42 + wx}
                y={90 - 16 * i + 4}
                width="4"
                height="6"
                rx="0.5"
                fill={wx === 15 && i % 2 === 0 ? "#ddf02e" : "#e9e6e2"}
                opacity={wx === 15 && i % 2 === 0 ? 1 : 0.55}
              />
            ))}
          </g>
        ))}
      </svg>
      {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
