'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Layered-stack hero: when the hero's bottom edge (the stats strip) reaches
 *  the viewport bottom, the section pins and following sections scroll up
 *  over it — the canonical ScrollTrigger `pinSpacing: false` recipe from the
 *  GSAP docs. `end: "max"` keeps it pinned as the base layer; sections after
 *  it carry opaque backgrounds + z-10 so the pinned hero is covered, never
 *  clipped. Reduced motion: no pin, the page stacks normally. */
export function HeroPin({ children, className }: { children: ReactNode; className?: string }) {
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
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className={className}>
      {children}
    </section>
  );
}
