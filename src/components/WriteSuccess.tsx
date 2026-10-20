import Link from "next/link";
import { explorerEntityUrl, explorerTxUrl } from "@/lib/arkiv/config";
import { Button, Card } from "./ui";
import { LinkHint } from "./LinkHint";
import { ExternalLink } from "lucide-react";

/** Post-write success screen: animated check, one sentence, primary link to
 *  the public page where the record landed, mono explorer links underneath. */
export function WriteSuccess({
  title,
  body,
  entityLabel,
  entityKey,
  evidenceKey,
  txHash,
  historyHref,
  historyLabel,
  onAgain,
  againLabel,
}: {
  title: string;
  body: string;
  entityLabel: string;
  entityKey: string;
  evidenceKey?: string;
  txHash?: string;
  historyHref?: string;
  historyLabel?: string;
  onAgain?: () => void;
  againLabel?: string;
}) {
  return (
    <Card className="p-8 text-center" role="status">
      <span className="check-pop mx-auto flex size-16 items-center justify-center rounded-full bg-success-bg">
        <svg viewBox="0 0 24 24" className="size-8 text-success" aria-hidden>
          <path
            className="check-draw"
            d="M4.5 12.5l5 5 10-11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">Success</span>
      </span>
      <h2 className="mt-4 text-lg font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>

      {historyHref && (
        <Link href={historyHref} className="mt-5 inline-block">
          <Button>
            {historyLabel ?? "See it on the history page →"}
            <LinkHint />
          </Button>
        </Link>
      )}

      <div className="mt-5 flex flex-col items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <a href={explorerEntityUrl(entityKey)} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 break-all text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
          {entityLabel} {entityKey} <ExternalLink size={11} aria-hidden />
        </a>
        {evidenceKey && (
          <a href={explorerEntityUrl(evidenceKey)} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 break-all text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
            evidence {evidenceKey} <ExternalLink size={11} aria-hidden />
          </a>
        )}
        {txHash && txHash !== "0x0" && (
          <a href={explorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 break-all text-foreground underline underline-offset-2 [@media(hover:hover)]:hover:underline">
            tx {txHash} <ExternalLink size={11} aria-hidden />
          </a>
        )}
      </div>

      {onAgain && (
        <Button variant="secondary" className="mt-5" onClick={onAgain}>
          {againLabel ?? "Write another"}
        </Button>
      )}
    </Card>
  );
}
