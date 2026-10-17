"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-danger/30 bg-danger-bg p-6" role="alert">
        <h1 className="font-medium text-danger">Couldn’t reach the Arkiv network</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The read from Tiramisu failed — the testnet or its RPC quota may be briefly
          exhausted. Nothing here is cached, so a retry hits the chain directly.
        </p>
        <Button variant="secondary" className="mt-4" onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
