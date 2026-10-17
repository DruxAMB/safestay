"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPublicClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { webSocket } from "viem";
import { PROJECT, TIRAMISU_WS } from "@/lib/arkiv/config";
import { Badge } from "@/components/ui";
import { useToast } from "@/components/Toaster";

/** Subscribes to the global Arkiv entity-event stream over WebSocket.
 *  When a deposit_outcome lands for this landlord, re-runs the server
 *  component — the history updates with no refresh. `landlord` null =
 *  global feed mode (any safestay_v1 entity). */
export function LiveWatcher({ landlord }: { landlord: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useToast();
  const dropped = useRef(false);

  // Announce feed transitions once — offline is the only state the user
  // can't infer from content, so it's the one worth a toast.
  useEffect(() => {
    if (status === "offline") {
      dropped.current = true;
      t.warn("Live feed offline", "The page still works — new records just won't refresh in real time.");
    } else if (status === "live" && dropped.current) {
      dropped.current = false;
      t.success("Live feed restored");
    }
  }, [status, t]);

  useEffect(() => {
    let unwatch: (() => void) | undefined;

    const client = createPublicClient({
      chain: tiramisu,
      transport: webSocket(TIRAMISU_WS),
    });

    const refresh = () => {
      // Debounce — a batch fires several events for one write.
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => router.refresh(), 400);
    };

    const onCandidate = async (entityKey: string) => {
      try {
        const e = await client.getEntity(entityKey as `0x${string}`);
        const attrs = e.attributes as Record<string, { type: string; value: unknown }> | undefined;
        if (attrs?.project?.value !== PROJECT) return;
        if (landlord && attrs?.entity_type?.value === "deposit_outcome") {
          const lw = attrs?.landlord_wallet?.value;
          if (typeof lw === "string" && lw.toLowerCase() !== landlord.toLowerCase()) return;
        }
        refresh();
      } catch {
        /* candidate vanished or failed to read — ignore */
      }
    };

    try {
      unwatch = client.watchEntityEvents({
        onEntityCreated: (event) => {
          const key = (event as { entityKey?: string }).entityKey;
          if (key) void onCandidate(key);
        },
        onError: () => setStatus("offline"),
      });
      // Not synchronous setState-in-effect: the flag flips only after the
      // subscription is actually registered.
      queueMicrotask(() => setStatus("live"));
    } catch {
      queueMicrotask(() => setStatus("offline"));
    }

    return () => {
      if (pending.current) clearTimeout(pending.current);
      unwatch?.();
    };
  }, [landlord, router]);
  return (
    <Badge tone={status === "live" ? "success" : status === "connecting" ? "warn" : "danger"}>
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {status === "live" ? "Live on Arkiv" : status === "connecting" ? "Connecting…" : "Live feed offline"}
    </Badge>
  );
}
