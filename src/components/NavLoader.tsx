"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BuildingLoader } from "./BuildingLoader";

/** Full-screen loading state for client-side page navigations. App Router
 *  holds the previous screen while a route streams (loading.tsx only covers
 *  hard loads), so the overlay is armed directly: capture-phase clicks on
 *  internal <a href="/…"> links, plus a "safestay:nav" event for router.push.
 *  A 120ms arm delay keeps instant/prefetched navs flash-free; a 15s safety
 *  clears it if a navigation never commits. Sits under the wallet modal
 *  (z-50) and toasts (z-60). */
export function NavLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [armedPath, setArmedPath] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  // Navigation committed → hide (render-time adjust, not an effect).
  if (visible && armedPath !== null && pathname !== armedPath) {
    setVisible(false);
    setArmedPath(null);
  }

  useEffect(() => {
    const arm = () => {
      timers.current.forEach(clearTimeout);
      const from = location.pathname;
      setArmedPath(from);
      timers.current = [
        // Only reveal if the nav hasn't already committed in the meantime.
        window.setTimeout(() => {
          if (location.pathname === from) setVisible(true);
        }, 120),
        // Safety: never trap the screen if a navigation silently dies.
        window.setTimeout(() => setVisible(false), 15_000),
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
