'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** A pinned placard layer: when the element's `start` hits, it fixes in place
 *  while later content keeps scrolling — the second half of the layered-stack
 *  recipe HeroPin starts. `pinSpacing` stays ON deliberately: the following
 *  content is already partially visible when these pins land, so collapsing
 *  the space would read as a jump instead of a rise. `end: "max"` keeps the
 *  element fixed until an opaque section slides over it; scrolling back
 *  releases everything in reverse. Reduced motion: no pin, normal flow. */
export function ScrollPin({
  children,
  start = 'top top',
  className,
}: {
  children: ReactNode;
  /** ScrollTrigger start — e.g. 'top 16%' pins when the element's top
   *  reaches 16% of the viewport. */
  start?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start,
        end: 'max',
        pin: true,
        anticipatePin: 1,
      });
    }, el);
    return () => ctx.revert();
  }, [start]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
