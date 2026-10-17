"use client";

import { useLinkStatus } from "next/link";

/** Inline navigation pending hint — a fixed-size dot inside any Link.
 *  Renders invisible always (no layout shift); when the route hasn't
 *  committed it fades in after a 100ms delay so fast navigations never
 *  flash it, then pulses until the transition completes. */
export function LinkHint() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={`link-hint${pending ? " is-pending" : ""}`} />;
}
