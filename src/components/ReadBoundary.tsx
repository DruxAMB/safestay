"use client";

import { Component, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";

/** Scoped boundary for optional server reads (e.g. the demo panel): a
 *  Tiramisu flap degrades that section instead of tripping the route-level
 *  error.tsx and taking the whole page down. Retry re-renders the route so
 *  the server components underneath are re-fetched. */
class Boundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("scoped read boundary:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex items-start gap-3 rounded-lg border border-warn bg-warn-bg p-4">
        <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0 text-warn" />
        <div>
          <p className="font-medium text-foreground">Can’t reach Arkiv right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The Tiramisu testnet isn’t answering — it may be rate-limiting or briefly
            unreachable. Records already on-chain are unaffected.
          </p>
          <button
            type="button"
            onClick={() => {
              this.props.onRetry();
              this.setState({ failed: false });
            }}
            className="mt-3 inline-flex min-h-10 items-center rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors [@media(hover:hover)]:hover:bg-muted"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

export function ReadBoundary({ children }: { children: ReactNode }) {
  const router = useRouter();
  return <Boundary onRetry={() => router.refresh()}>{children}</Boundary>;
}
