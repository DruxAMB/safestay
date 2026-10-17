/** Map raw wallet/RPC/server errors to a one-line friendly message.
 *  The raw message is still logged server-side; users get the action they
 *  can take, not a stack trace. */
export function friendlyError(e: unknown): string {
  const msg = (e instanceof Error ? e.message : String(e)) || "Something went wrong";
  if (/user rejected|user denied|rejected the request|declined/i.test(msg))
    return "Rejected in your wallet — no changes were made.";
  if (/insufficient funds|exceeds the balance/i.test(msg))
    return "The signing wallet has no test ETH on Tiramisu — fund it and retry.";
  if (/ANON_COST_LIMITED|cost.?limit|quota/i.test(msg))
    return "The demo's free RPC budget is exhausted — retry shortly.";
  if (/timed? ?out|didn't respond|deadline/i.test(msg))
    return "Timed out waiting for a response — check your connection and retry.";
  if (/EntityMutationError|Execution error|receipt/i.test(msg))
    // An exception doesn't prove the write failed — the tx may still land.
    // Row-id reuse makes a retry safe, but say the honest thing.
    return "The write's outcome is uncertain — it may still land on-chain. Check the link/explorer before retrying.";
  if (/429|rate.?limit|too many requests/i.test(msg))
    return "Rate limited — wait a moment, then retry.";
  if (/NoEntityFound|no entity|expired|deleted/i.test(msg))
    return "That record isn't on the chain — it may have expired.";
  if (/network|fetch failed|ECONNREFUSED|unreachable/i.test(msg))
    return "Couldn't reach the network — check your connection and retry.";
  return msg.length > 140 ? `${msg.slice(0, 137)}…` : msg;
}
