"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { useToast } from "./Toaster";

/** Copies this landlord's history URL — the product's core affordance is
 *  "send this link to a renter", so the page carries it. */
export function CopyShareButton() {
  const t = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          t.success("History link copied", "Send it to anyone — it reads straight from Arkiv.");
          setTimeout(() => setCopied(false), 2500);
        } catch {
          t.danger("Couldn't copy", "Clipboard blocked — copy the address bar manually.");
        }
      }}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors [@media(hover:hover)]:hover:bg-muted"
    >
      {copied ? <Check size={12} aria-hidden className="text-success" /> : <Link2 size={12} aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
