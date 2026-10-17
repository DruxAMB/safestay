/** Deterministic wallet identicon — a tiny building glyph derived from
 *  the address itself: height, width, roof style, facade tone and the
 *  accent-lit panes all come from the address nibbles, so every wallet
 *  gets a stable pfp in the same clay + ink + lime language as the
 *  hero renders. */
const FACADES = ["#f5f0e6", "#e8e2d6", "#efe6d8"] as const;

export function WalletAvatar({ address, size = 20 }: { address: string; size?: number }) {
  const nib = [...address.toLowerCase().replace(/^0x/, "")].map((c) =>
    parseInt(c, 16),
  );
  const floors = 3 + (nib[0] % 3); // 3–5 floors
  const BW = 9 + (nib[5] % 4); // front width 9–12
  const SX = 4;
  const COLS = BW > 11 ? 4 : 3;
  const FH = 3.6;
  const facade = FACADES[nib[6] % FACADES.length];
  const bulkhead = nib[7] % 2 === 1; // half get a roof bulkhead
  const bx = 5, base = 21, by = base - floors * FH;
  const lit = new Set<number>();
  for (let i = 0; i < 4; i++) lit.add(nib[1 + i] % (floors * COLS));

  const wins = [];
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < COLS; c++) {
      const idx = f * COLS + c;
      wins.push(
        <rect
          key={idx}
          x={bx + 1.2 + c * ((BW - 2.2) / COLS)}
          y={base - FH - f * FH + 1.1}
          width={2.1}
          height={2.3}
          fill={lit.has(idx) ? "#ddf02e" : "#37342f"}
        />,
      );
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden
      className="shrink-0 rounded-sm border border-border bg-[#f4f2f0]"
    >
      {/* side face — pseudo-3D depth */}
      <polygon
        points={`${bx + BW},${by} ${bx + BW + SX},${by - 1.6} ${bx + BW + SX},${base - 1.6} ${bx + BW},${base}`}
        fill="#9a9184"
      />
      {/* front face + windows */}
      <rect x={bx} y={by} width={BW} height={base - by} fill={facade} />
      {wins}
      {/* roofline — cap slab, half the addresses also get a bulkhead */}
      <rect x={bx - 0.6} y={by - 1} width={BW + 1.2} height={1} fill="#9a9184" />
      {bulkhead && <rect x={bx + 1.5} y={by - 2.4} width={BW * 0.45} height={1.6} fill={facade} stroke="#9a9184" strokeWidth={0.4} />}
      <rect x={bx - 1} y={base} width={BW + SX + 1.4} height={0.8} fill="#dad3c5" />
    </svg>
  );
}
