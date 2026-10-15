"use client";

import { useRouter } from "next/navigation";
import { useState, useId } from "react";
import { Search } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { SEEDED_LANDLORDS } from "@/lib/arkiv/config";
import { shortAddr } from "@/lib/format";

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export function LookupForm() {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function go(addr: string) {
    router.push(`/landlord/${addr.trim()}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!ADDR_RE.test(v)) {
      setError("Enter a full wallet address — 0x followed by 40 hex characters.");
      return;
    }
    setError(null);
    go(v);
  }

  return (
    <div className="w-full">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor={id}>Landlord wallet address</Label>
          <Input
            id={id}
            value={value}
            onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
            placeholder="0x…"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            className="font-mono"
          />
        </div>
        <Button type="submit" disabled={!value.trim()}>
          <Search size={16} aria-hidden /> Check history
        </Button>
      </form>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm text-danger">{error}</p>
      )}

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Seeded demo landlords — one click, live on Tiramisu
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SEEDED_LANDLORDS.map((l) => (
          <button
            key={l.address}
            type="button"
            onClick={() => go(l.address)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary/5"
          >
            <span className="font-medium">{l.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{shortAddr(l.address)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
