"use client";

import { useRouter } from "next/navigation";
import { useState, useId } from "react";
import { Search } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { shortAddr } from "@/lib/format";

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export type DirectoryEntry = {
  address: string;
  name?: string;
  city?: string;
  termsCount: number;
};

/** Landlord lookup — address OR display name. The directory below is live
 *  chain data: every wallet that ever signed deposit_terms, with names from
 *  self-signed landlord_profile entities. Nothing is hardcoded. */
export function LookupForm({ directory }: { directory: DirectoryEntry[] }) {
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
    if (ADDR_RE.test(v)) {
      setError(null);
      go(v);
      return;
    }
    // name lookup against the on-chain directory
    const q = v.toLowerCase();
    const hit = directory.find(
      (d) => d.name && (d.name.toLowerCase() === q || d.name.toLowerCase().includes(q)),
    );
    if (hit) {
      setError(null);
      go(hit.address);
      return;
    }
    setError(
      directory.length
        ? "No registered landlord matches — try a wallet address, or pick from the directory."
        : "Enter a wallet address (0x + 40 hex).",
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor={id}>Landlord wallet address or name</Label>
          <Input
            id={id}
            value={value}
            onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
            placeholder="0x… or a name like “Sunrise PG”"
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
        Landlord directory — read live from Arkiv
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {directory.map((l) => (
          <button
            key={l.address}
            type="button"
            onClick={() => go(l.address)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary/5"
          >
            <span className="font-medium">{l.name ?? shortAddr(l.address)}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {l.name ? shortAddr(l.address) : `${l.termsCount} terms`}
            </span>
          </button>
        ))}
        {directory.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No landlords have signed terms yet — be the first via Record.
          </p>
        )}
      </div>
    </div>
  );
}
