# SafeStay — Demo Video Script (v2, current app)

**Cap:** 3:00 · **Target runtime:** ~2:35 · **Format:** screen recording + voiceover, recorded by the Indian teammate.
**Budget note:** the nav-loading screen holds ~3.4s on every page change by design — narrate over it ("while it reads the chain"), don't cut it. ~10s of the runtime is loader.

**Recording mode decision (pick before rolling):**
- **Primary — demo mode** (`/record` → "No wallet? Demo mode"): deterministic, no extension dance, still real Arkiv writes signed by the seeded wallets. Recommended.
- **Alternate — real wallet:** more impressive (MetaMask popup on camera), but requires the recording wallet to be funded on Tiramisu and adds ~20s of popup time. Use only if rehearsed twice clean.

**Pre-record checklist (run the morning of):**
- [ ] `npm run dev` or the deployed URL loads; feed shows ~40 entities
- [ ] `/record` → demo mode → outcome select lists `btm_pg_bed_10 · ₹26,000` (fresh open terms for demo tenant — created entity `0x6f4d631b…`; if answered since, sign another via the terms form below it)
- [ ] Hard-refresh once so first nav isn't cold-slow beyond the loader dwell
- [ ] Incognito check: no console errors; 1440×900+ window, zoom 100%
- [ ] If recording the wallet path: MetaMask unlocked, on Tiramisu, GLM > 0

---

## Shot list

| # | Time | Screen | Action | VO (read verbatim) |
|---|------|--------|--------|--------------------|
| 1 | 0:00–0:15 | `/` hero | Hover the 3D building — units ignite; click the **Sunrise PG** chip — the building collapses and the L-block rises, dossier swaps in | "Every year, renters in India hand landlords twenty thousand to a lakh of rupees — with no way to check who kept the last tenant's deposit. SafeStay puts that history on a public database nobody controls." |
| 2 | 0:15–0:35 | `/` → `/landlord/0x99Ba…24f7` | Click **Check history** → loader: "it restructures while it reads the chain" → history page lands: **24% returned** bar, `kept ₹28,000` figures, red-amber pattern strip | "This is Sunrise PG's record on Tiramisu — five signed deposits, one point four lakh promised, a third returned. Every outcome is signed by a tenant's wallet, and verified only if the landlord's own terms named that wallet back. Fake reviews need the landlord's signature — which incriminates them." |
| 3 | 0:35–0:50 | same page | Click an outcome's explorer link → Tiramisu explorer shows the real entity, `$creator` = tenant wallet | "Not our database — Arkiv. This entity is signed, typed, and expiring, readable by anyone, editable by no one — including us." |
| 4 | 0:50–1:05 | `/feed` | Click Feed → loader → live ledger scrolls: terms, outcomes, evidence, severity edges, `history` links | "Every record SafeStay ever writes lands here in real time — served by Arkiv's WebSocket event stream, newest first." |
| 5 | 1:05–1:45 | `/record` | Open **Demo mode** → *Record an outcome* → pick `btm_pg_bed_10 · ₹26,000` → outcome "Returned partially", returned `10000`, attach any file → hashes in-browser → **Record outcome** → one tx, two entities; toast + explorer links | "Now the tenant's side. This file never leaves the browser — only its SHA-256 goes on-chain. One batch transaction writes the outcome and the evidence atomically." |
| 6 | 1:45–2:00 | back to `/landlord/0x99Ba…24f7` | The **Live on Arkiv** badge; the new outcome is already in the list — return % has dropped, pattern strip gained a dot | "And the public record just changed — no refresh, straight off the event stream. This is the moment a renter in Bangalore checks before paying sixty thousand." |
| 7 | 2:00–2:20 | `/record` landlord section | *Sign terms as demo landlord* → fill label/city/deposit → **Sign deposit terms** → entity link + note the `+12mo` renew affordance | "The landlord's side is a signature too — terms they can't edit later. And when a tenancy renews, the record extends — Entity Expiration and Lifetime Extension, native to Arkiv." |
| 8 | 2:20–2:35 | `/about` | Scroll the query list + creator directory, end on "Postgres / IPFS / API" section | "Every record expires in about thirty months — the truth outlives this app, not the person. Postgres can be edited by whoever runs it. This can't. SafeStay — deposit history landlords can't rewrite." |

## Cut if running long (in order)
1. Step 4 feed beat (−15s) — it's a bonus surface, not the money shot.
2. Step 7 landlord write (−20s) — the terms signature matters less than the outcome linkage; mention it in VO during step 5 instead.
3. Step 8 → cut to a 5s hold on the history page over the closing line.

## Do NOT show on camera
- `.env.local`, private keys, the seed script's key material
- Demo-mode internals beyond what the UI states (it already says "seeded wallets" on screen — that's the honest disclosure)
- Browser chrome beyond the viewport if the profile has personal bookmarks

## Numbers a judge will fact-check (all live on-chain)
- Sunrise PG `0x99Ba…24f7`: 5 outcomes / 5 terms / 24% returned / ₹1.4L promised / ₹34,000 returned / ₹1.1L withheld / 5-of-5 verified
- Skyline Towers `0x5cf8…b2D3`: 3 terms / 2 outcomes / 1 awaiting
- Step 5 writes `deposit_outcome` + evidence `executeBatch` — one tx hash, two entity keys, both in the success card
- Explorer: `tiramisu.explorer.arkiv.network/entity/<key>` — every link on screen resolves
