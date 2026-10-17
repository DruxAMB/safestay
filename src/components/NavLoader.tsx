"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BuildingLoader } from "./BuildingLoader";

/** Full-screen loading state for client-side page navigations. App Router
 *  holds the previous screen while a route streams (loading.tsx only covers
 *  hard loads), so the overlay is armed directly: capture-phase clicks on
 *  internal <a href="/…"> links, plus a "safestay:nav" event for router.push.
 *
 *  Every navigation shows it for a MINIMUM dwell — one full restructure loop
 *  (3.4s) — even if the route commits instantly, so the animation always
 *  reads as a complete build cycle rather than a flash. A 15s safety clears
 *  it if a navigation never commits. Sits under the wallet modal (z-50) and
 *  toasts (z-60). */
const REVEAL_MS = 120;
const MIN_DWELL_MS = 3400;
const SAFETY_MS = 15_000;

export function NavLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [armedPath, setArmedPath] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);
  const timers = useRef<number[]>([]);
  const armedAt = useRef(0);

  // Navigation committed → record it; the hide timer (below) enforces dwell.
  if (!committed && armedPath !== null && pathname !== armedPath) {
    setCommitted(true);
  }

  // Once committed, hold the overlay until the minimum dwell has elapsed.
  useEffect(() => {
    if (!committed) return;
    const wait = Math.max(0, armedAt.current + REVEAL_MS + MIN_DWELL_MS - Date.now());
    const t = window.setTimeout(() => {
      setVisible(false);
      setCommitted(false);
      setArmedPath(null);
    }, wait);
    timers.current.push(t);
    return () => window.clearTimeout(t);
  }, [committed]);

  useEffect(() => {
    const hide = () => {
      setVisible(false);
      setCommitted(false);
      setArmedPath(null);
    };
    const arm = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      armedAt.current = Date.now();
      setArmedPath(location.pathname);
      setCommitted(false);
      timers.current = [
        window.setTimeout(() => setVisible(true), REVEAL_MS),
        window.setTimeout(hide, SAFETY_MS),
      ];
    };
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || (a as HTMLAnchorElement).target || a.hasAttribute("download")) return;
      const href = (a as HTMLAnchorElement).getAttribute("href") ?? "";
      if (!href.startsWith("/")) return;
      // Same-path links re-render without a pathname change — nothing to wait on.
      if (new URL(href, location.href).pathname === location.pathname) return;
      arm();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("safestay:nav", arm);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("safestay:nav", arm);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="pop-in fixed inset-0 z-40 flex items-center justify-center bg-background/85 backdrop-blur-[2px]">
      <BuildingLoader />
    </div>
  );
}
