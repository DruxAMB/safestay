/** SafeStay mark — the L-block silhouette the whole brand is built from
 *  (hero model, nav loader, wallet avatars): two tower slabs stepping right
 *  over a wide base slab, with punched panes and a single lime accent pane.
 *  Flat fills so it holds at 20px; colors inherit the bone surface it sits
 *  on for the pane cut-outs. */
export function SafeStayMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {/* L-block: base + two tower slabs */}
      <rect x="12" y="2.5" width="7" height="5.5" rx="1.2" fill="#0c0a08" />
      <rect x="12" y="9" width="7" height="5.5" rx="1.2" fill="#0c0a08" />
      <rect x="5" y="15.5" width="14" height="6" rx="1.4" fill="#0c0a08" />
      {/* tower panes — one lime */}
      <rect x="13.5" y="4.4" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0" />
      <rect x="16.1" y="4.4" width="1.8" height="2.2" rx="0.4" fill="#ddf02e" />
      <rect x="13.5" y="10.9" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0" />
      <rect x="16.1" y="10.9" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0" />
      {/* base panes */}
      <rect x="7" y="17.4" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0" />
      <rect x="10" y="17.4" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0" />
      <rect x="13" y="17.4" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0" />
      <rect x="16" y="17.4" width="1.8" height="2.2" rx="0.4" fill="#f4f2f0" />
    </svg>
  );
}
