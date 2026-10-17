"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

/** The Tiramisu testnet (or the path to it) can flap — a failed chain read
 *  should show an honest degraded state, not a crash. */
export default function RecordError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("record route error:", error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-start gap-3 rounded-lg border border-warn bg-warn-bg p-4">
        <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0 text-warn" />
        <div>
          <h1 className="font-medium text-foreground">Can’t reach Arkiv right now</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The Tiramisu testnet isn’t answering — it may be rate-limiting or briefly
            unreachable. Records you already saw are still on-chain; this is a
            connectivity problem, not lost data.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 inline-flex min-h-10 items-center rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors [@media(hover:hover)]:hover:bg-muted"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
