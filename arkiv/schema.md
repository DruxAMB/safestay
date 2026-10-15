# SafeStay — Arkiv entity schema

Every SafeStay record is an Arkiv entity on **Tiramisu** (chain `7738577`).
Trust comes from `$creator` (immutable on-chain provenance) plus a
**two-way cross-creator link**: a landlord signs `deposit_terms` naming a
tenant wallet; the tenant's `deposit_outcome` is only accepted by the app
when the referenced terms entity names them back. A fabricated review would
need a colluding landlord signature — which incriminates the landlord.

All entities are created `readonly: true` (contents can never be patched)
and `permissionlessExtension: false`. All attribute names are lowercase
`[a-z][a-z0-9_]*` — Tiramisu rejects uppercase names at write time.

Common attributes (every entity):

| attribute | type | meaning |
|---|---|---|
| `project` | `str` | `safestay_v1` — namespace scope |
| `entity_type` | `str` | `deposit_terms` \| `deposit_outcome` \| `evidence_log` |
| `schema_version` | `i32` | `1` |
| `created_at` | `u64` | application ms timestamp (on-chain `createdAt` is a block) |
| `city` | `str` | lowercase slug, e.g. `bengaluru`, `mumbai`, `delhi` |

## `deposit_terms` — creator: landlord wallet, expires 365 days

| attribute | type | meaning |
|---|---|---|
| `tenant_wallet` | `addr` | the tenant this agreement binds |
| `deposit_inr` | `u256` | whole rupees promised |
| `property_label` | `str` | synthetic label, e.g. `hsr_2bhk_a` |
| `terms_id` | `str` | stable application row id |

Payload (public JSON): `{display_label, move_in, duration_months, note}`

## `deposit_outcome` — creator: tenant wallet, expires 730 days

| attribute | type | meaning |
|---|---|---|
| `landlord_wallet` | `addr` | **the lookup key** — who the review is about |
| `terms_key` | `key` | reference to the `deposit_terms` entity |
| `outcome` | `str` | `returned_full` \| `returned_partial` \| `withheld` |
| `amount_returned_inr` | `u256` | whole rupees actually returned |
| `outcome_id` | `str` | stable application row id |
| `city` | `str` | denormalized from terms for city filtering |

Payload (public JSON): `{comment, deposit_inr, display_label}`

## `evidence_log` — creator: tenant wallet, expires 730 days

Written **atomically in the same `executeBatch`** as its `deposit_outcome`
via `predictEntityKeys` — a real atomic product action, not a demo trick.

| attribute | type | meaning |
|---|---|---|
| `outcome_key` | `key` | the outcome it evidences |
| `landlord_wallet` | `addr` | denormalized |
| `evidence_sha256` | `bytes32` | SHA-256 of a photo/doc the tenant keeps |
| `evidence_kind` | `str` | `photo` \| `chat` \| `doc` |

Payload (public JSON): `{filename_hint, byte_size, note}` — the file itself
never touches Arkiv (deliberately kept off-chain: privacy + cost).

## Exact queries used by the app

1. **Landlord history (the lookup):**
   `project='safestay_v1' AND entity_type='deposit_outcome' AND landlord_wallet=<addr>`
   — open scope on purpose: any tenant may review; trust is the two-way link.
2. **Terms verification:** `getEntity(terms_key)` then check
   `terms.tenant_wallet === outcome.$creator` client-side.
3. **Landlord's own signed terms:** `.createdBy(landlord)` +
   `entity_type='deposit_terms'`.
4. **Live feed:** `watchEntityEvents` → fetch candidate → keep when
   `project='safestay_v1'` (watcher is global by design).
5. **Evidence for an outcome:** `entity_type='evidence_log' AND
   outcome_key=<key>`.

## What stays off Arkiv, deliberately

Photos/documents (hash only), tenant/landlord names, phone numbers, exact
addresses. Arkiv carries provenance-bound truth; it must not carry PII.

## Creator wallets (Tiramisu, demo seed)

| role | address |
|---|---|
| landlord A — "Sharma Properties" | _seeded at deploy time_ |
| landlord B — "Lakeview PG" | _seeded at deploy time_ |
| landlord C — "Sunrise Homes" | _seeded at deploy time_ |
| demo tenant | _seeded at deploy time_ |
