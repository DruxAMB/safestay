import Link from "next/link";
import { Button } from "@/components/ui";
import { LinkHint } from "@/components/LinkHint";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-xl font-medium">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That URL doesn’t exist.</p>
      <Link href="/"><Button variant="secondary" className="mt-4">Back to SafeStay <LinkHint /></Button></Link>
    </div>
  );
}
