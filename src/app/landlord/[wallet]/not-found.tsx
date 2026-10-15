import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="font-semibold">That doesn’t look like a wallet address</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A Tiramisu wallet address is <code className="font-mono">0x</code> plus 40
          hexadecimal characters. Check the address and try again.
        </p>
        <Link href="/"><Button variant="secondary" className="mt-4">Back to lookup</Button></Link>
      </div>
    </div>
  );
}
