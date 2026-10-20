'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Layered-stack section: when the section's bottom edge reaches the
 *  viewport bottom it pins and following sections scroll up over it — the
 *  canonical ScrollTrigger `pinSpacing: false` recipe from the GSAP docs.
 *  `end: "max"` keeps it pinned as the base layer; sections after it must
 *  carry an opaque background + rising z-index so the pinned section is
 *  covered, never clipped. Reduced motion: no pin, the page stacks normally. */
export function SectionPin({ children, className, ariaLabel }: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'bottom bottom',
        end: 'max',
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
      });
    }, el);
    // Suspense slots (stats strip, dossier) grow the section after the
    // trigger is created — re-measure so 'bottom bottom' tracks the real
    // bottom edge instead of the pre-hydration height.
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={ref} className={className} aria-label={ariaLabel}>
      {children}
    </section>
  );
}
