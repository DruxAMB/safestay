"use client";

import { useRouter } from "next/navigation";
import { useState, useId } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { shortAddr } from "@/lib/format";
import { TOWER_LANDLORD } from "@/lib/arkiv/config";
import { useHeroSelection } from "./HeroSelection";
import { useToast } from "./Toaster";

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export type DirectoryEntry = {
  address: string;
  name?: string;
  city?: string;
  termsCount: number;
};

/** Landlord lookup — address OR display name. The directory below is live
 *  chain data: every wallet that ever signed deposit_terms, with names from
 *  self-signed landlord_profile entities. Nothing is hardcoded.
 *  `directory: null` = the chain read failed — `directoryNote` names the real
 *  cause (timeout, quota, error). The form still works by wallet address;
 *  only chips/name-resolution are degraded. */
export function LookupForm({ directory, directoryNote }: {
  directory: DirectoryEntry[] | null;
  directoryNote?: string;
}) {
  const entries = directory ?? [];
  const router = useRouter();
  const id = useId();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Selection lives in hero context — chips and clicking a lit unit in the
  // building both land here. While something is picked the input shows the
  // picked address; the first keystroke clears it and the field is yours.
  const { selected, select } = useHeroSelection();
  const t = useToast();
  const picked = selected;
  const value = picked ?? typed;

  function go(addr: string) {
    router.push(`/landlord/${addr.trim()}`);
  }

  function pick(l: DirectoryEntry) {
    setError(null);
    select(l.address);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (picked && v === picked) {
      go(v);
      return;
    }
    if (ADDR_RE.test(v)) {
      setError(null);
      go(v);
      return;
    }
    // name lookup against the on-chain directory
    const q = v.toLowerCase();
    const hit = entries.find(
      (d) => d.name && (d.name.toLowerCase() === q || d.name.toLowerCase().includes(q)),
    );
    if (hit) {
      setError(null);
      go(hit.address);
      return;
    }
    const msg = entries.length
      ? "No registered landlord matches — try a wallet address, or pick from the directory."
      : "Enter a wallet address (0x + 40 hex).";
    setError(msg);
    t.danger("No match", msg);
  }

  return (
    <div className="w-full">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor={id}>Landlord wallet address or name</Label>
          <Input
            id={id}
            value={value}
            onChange={(e) => {
              setTyped(e.target.value);
              if (error) setError(null);
              if (picked) select(null);
            }}
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
          {picked ? (
            <>View full history <ArrowRight size={16} aria-hidden /></>
          ) : (
            <><Search size={16} aria-hidden /> Check history</>
          )}
        </Button>
      </form>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm text-danger">{error}</p>
      )}

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Landlord directory — read live from Arkiv
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {entries.map((l) => (
          <button
            key={l.address}
            type="button"
            onClick={() => pick(l)}
            aria-pressed={picked === l.address}
            className={`inline-flex min-h-11 items-center gap-2 rounded-sm border px-4 text-sm transition-colors [@media(hover:hover)]:hover:border-foreground ${
              picked === l.address
                ? "border-foreground bg-primary/20"
                : "border-border bg-card [@media(hover:hover)]:hover:bg-muted"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={l.address.toLowerCase() === TOWER_LANDLORD ? "/hero-tower.png" : "/hero-building.png"}
              alt="" aria-hidden
              className="size-6 shrink-0 rounded-full border border-border object-cover"
            />
            <span className="font-medium">{l.name ?? shortAddr(l.address, 5, 3)}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {l.name ? shortAddr(l.address, 5, 3) : `${l.termsCount} terms`}
            </span>
          </button>
        ))}
        {directory === null && (
          <p className="text-sm text-muted-foreground">
            {directoryNote ??
              "The directory is unavailable — search by wallet address above still works."}
          </p>
        )}
        {directory !== null && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No landlords have signed terms yet — be the first via Record.
          </p>
        )}
      </div>
    </div>
  );
}
