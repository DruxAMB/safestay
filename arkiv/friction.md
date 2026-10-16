# Friction report — building SafeStay on Arkiv

What actually hurt, what surprised us, and what we worked around. Everything below was
observed against `@arkiv-network/sdk@0.8.1` on Tiramisu (chain 7738577) during this build —
each entry includes the concrete error or behaviour, not a paraphrase.

## 1. Bare `select()` queries fail — a predicate is mandatory

**Observed.** `await select().fetch()` → `A query needs at least one filter`.
There is no way to ask for "the N most recent entities in a namespace" without a predicate.

**Workaround.** We lean on `$creator` + a project attribute (`project = 'safestay_v1'`) as the
always-present predicate and walk pages ourselves. Fine for us, but a bare `latest()` helper
would be the intuitive first call for most builders.

## 2. `createdAt` exists but is NOT indexed — range filters on it silently return nothing

**Observed.** AGENTS.md guidance implies creation-time filtering; `gt("createdAt", …)` returned
zero rows with no error. Numeric range filters only work on attributes you index yourself.

**Workaround.** We write our own `ts: u64` attribute on every entity (`schema.ts`) and filter/sort
on that. Cost: one extra attribute slot per entity.

**Fix suggestion.** Either index `createdAt` like `$creator`, or surface a clear
`unindexed attribute` error so it fails loudly instead of returning an empty set.

## 3. Attribute name casing is stricter than the SDK types suggest

**Observed.** The SDK type declarations accept `camelCase` attribute names, but Tiramisu
rejects them at write time (`invalid attribute name`). Only lowercase `snake_case` works.

**Workaround.** All schema keys are `snake_case` (`entity_type`, `landlord_wallet`, `terms_id`).
The type layer could enforce this instead of the RPC layer.

## 4. Timestamps need `u64()` — a bare `Date.now()` becomes `i32` and overflows

**Observed.** Passing a JS `number` for a millisecond timestamp typed the attribute `i32`,
which overflows after 2038… and actually mis-stores *today* for ms values. The error is
silent — the entity writes fine with a wrong-typed attribute.

**Workaround.** `u64(BigInt(Date.now()))` everywhere, centralized in `schema.ts` so it can't
be forgotten. A `date()` attribute helper would remove a whole class of silent corruption.

## 5. Event-handler names differ from the docs pattern

**Observed.** `watchEntityEvents({ filters, onEntityEvent })` — the intuitive name — does
nothing (no error, just silence). The actual handlers are `onEntityCreated` / `onEvent`.

**Workaround.** Correct names confirmed by reading the installed `.d.ts`. A compile-time
exhaustive type on the options object (or a runtime "unknown key" warning) would have
caught this in seconds instead of an hour of watching a silent stream.

## 6. The WebSocket event stream is global — app-side filtering is mandatory

**Observed.** `watchEntityEvents` delivers *every* entity created on Tiramisu network-wide —
other builders' test entities, other apps' writes, everything. On a public testnet this is
expected, but it isn't obvious from the API surface.

**Workaround.** `LiveWatcher` filters on `project = 'safestay_v1'` before updating UI.
Docs should state this loudly; a `namespace` filter param would be even better.

## 7. Attribute values deserialize as `{ type, value }` with `BigInt` — `JSON.stringify` dies

**Observed.** `u64`/`u256` attributes come back as `bigint` inside a `{ type, value }`
envelope. `JSON.stringify(entity)` throws `Do not know how to serialize a BigInt`, which
kills the naive "send the entity to the client component" pattern.

**Workaround.** A display-DTO layer (`queries.ts` → `HistoryView`) converts every bigint to
string at the boundary. This is correct-by-construction but it means *no* code path can ever
pass a raw entity across the RSC boundary — an eslint rule or a `toJSON` on the SDK's
entity type would enforce it.

## 8. `predictEntityKeys` salts must be reused — and `executeBatch` returns no deadlines

**Observed.** For the atomic outcome+evidence batch we need both entity keys before the tx
to cross-link them. `predictEntityKeys` gives the keys, but `executeBatch`'s result doesn't
carry `expiresAt` per entity — you must decode `EntityCreated` logs yourself to get them.

**Workaround.** We re-derive expiry from `expiresAt` math (blocks ≈ 2s) for display and
label it `~24 months` rather than pretend precision. Returning per-entity deadlines in the
batch receipt would close the gap.

## 9. No `ORDER BY` — "newest first" is the only ordering

**Observed.** Result order is by creation block, newest first, and cannot be changed.
"Oldest outcome first" or "sort by amount" are impossible at the query layer.

**Workaround.** Bounded paginated fetch into memory, sort in JS, cap result sets
(`MAX_HISTORY = 40`). Fine at our scale; a real app needs an indexer. Documenting the cap
matters — `queries.ts` names it.

## 10. Readonly is immutable — corrections need a new key + mapping

**Observed.** We flag `deposit_terms` readonly (landlords shouldn't edit signed terms). A
typo'd terms record can't be patched — a corrected entity must be created and linked.
That's by design, but it means "edit" UX is a replace-and-supersede flow, not a mutation.

**Workaround.** We surface the immutability as a *feature* in the UI ("the landlord cannot
edit this record") — honest framing of a real constraint. Worth calling out in docs as a
data-modeling decision, not just an API flag.

## 11. The public RPC anonymous-cost-limits bursts — `HTTP 429 ANON_COST_LIMITED`

**Observed.** A Next.js page that fires several `arkiv_query` calls at once (our landlord
history runs an outcomes walk + a terms walk in `Promise.all`, each preceded by its own
`getBlockNumber`) started failing mid-render: `HttpRequestError: HTTP request failed.
Status: 429 … Details: "ANON_COST_LIMITED"`. Worse: the failure was intermittent and
load-dependent — a page that rendered fine in isolation broke under normal browsing.

**Workaround.** Three layers, all in `clients.ts`/`queries.ts`:

- `retryCount`/`retryDelay` on the viem `http()` transport — we had originally set
  `retryCount: 0` which turned every transient 429 into a hard page error. viem retries
  HTTP 429 natively; we just hadn't enabled it.
- JSON-RPC `batch` on the same transport — Tiramisu accepts batched envelopes, so the
  concurrent `Promise.all` reads collapse into ~1 HTTP request per page instead of 4–6.
- Shared snapshots — `walk()` now accepts a caller-pinned block, so the two walks in a
  history read share one `getBlockNumber` instead of paying for two. This also makes the
  paired queries *consistent at the same block*, which they weren't before.

**Fix suggestion.** Return `Retry-After` on 429 so clients can back off precisely, and
document the anonymous cost budget (requests/sec? compute units?) — "ANON_COST_LIMITED"
tells you that you paid too much, not what the budget is. A hosted-RPC-key story for
production apps would close this entirely.

## What went smoothly (worth keeping)

- `executeBatch` atomicity made the two-way-linked outcome+evidence pattern trivially safe.
- `createdBy` / `$creator` scoping "just worked" — the security pillar's exact requirement
  maps to a one-line predicate.
- `ExpirationTime.fromDays()` + `extendEntity` behaved exactly as documented; the expiry
  countdown in the UI reads straight off entity metadata.
- Public reads need no wallet — the judge-facing lookup page is keyless end to end.
