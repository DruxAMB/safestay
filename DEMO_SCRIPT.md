# SafeStay — Demo Video Script (v3)

**Cap:** 3:00 (hard rule) · **Target:** ~2:10 · **Format:** screen recording + voiceover, recorded by the Indian teammate.
**Read it like you're showing a friend the app, not narrating an ad.** Contractions, short sentences, slight pauses while the cursor does its thing — silence during a load is fine if the visual carries it.
**Nav loader:** ~3.4s per page change by design — talk over it ("while it reads the chain"), don't cut around it. ~8s of runtime is loader.

**Recording mode:** **demo mode** (`/record` → "No wallet?") — deterministic, still real Arkiv writes. Real-MetaMask signing only if the recording wallet is funded on Tiramisu and rehearsed twice clean.

**Pre-record checklist:**
- [ ] App loads; `/feed` shows ~40 entities
- [ ] `/record` → demo mode → outcome select lists `btm_pg_bed_10 · ₹26,000` (if it's gone, sign another open terms with the terms form below it)
- [ ] One hard refresh so the first nav isn't cold-slow beyond the loader
- [ ] Incognito, 1440×900+, zoom 100%, no console errors, no bookmarks bar

---

## Shot 1 — Hero (0:00–0:15)
**Do:** hover the 3D building — units ignite. Click the **Sunrise PG** chip — building collapses, L-block rises, dossier swaps in.

**Say:**
> "So here's a problem anyone who's rented in India knows. You hand the landlord sixty, eighty thousand rupees — and you've got no way to check if the last tenant ever saw theirs again. SafeStay is a public track record for that."

## Shot 2 — Landlord history (0:15–0:40)
**Do:** click **Check history** → loader plays → history page lands. Let the **24% returned** bar, `kept ₹28,000` figures and the red-amber dot strip sit on screen a beat. Scroll the outcome cards slowly.

**Say:**
> "This is Sunrise PG's record on Tiramisu — five deposits signed on-chain. They promised back about 1.4 lakh across those stays… and returned a third of it. You can see each one — kept twenty-eight here, kept twenty-five there. Every outcome is signed by a tenant's wallet — and it only counts as verified if the landlord's own terms named that tenant back. So you can't fake the reviews."

## Shot 3 — Explorer (0:40–0:50)
**Do:** click an outcome's explorer link → Tiramisu explorer: real entity, `$creator` = the tenant wallet. Hover the creator field.

**Say:**
> "And this isn't our database — it's Arkiv. That's the actual entity, signed by the tenant's own wallet. Anyone can read it — nobody can edit it, including us."

## Shot 4 — The write (0:50–1:25)
**Do:** `/record` → open **Demo mode** → *Record an outcome* → pick `btm_pg_bed_10 · ₹26,000` → "Returned partially", amount `10000`, attach any file (watch it hash) → **Record outcome** → toast + explorer links in the success card.

**Say:**
> "Now the other side. I'm acting as a tenant — pick my terms, say I got ten of twenty-six back, attach a photo as evidence. The file never leaves the browser — only its hash goes on-chain. One transaction, two entities — outcome plus evidence, atomically."

## Shot 5 — Live update (1:25–1:45)
**Do:** navigate back to Sunrise's history. Pause on the **Live on Arkiv** badge, then the fresh outcome already in the list — lower return %, extra red dot on the strip.

**Say:**
> "Go back to the landlord's page and it's already there — the page listens to Arkiv's event stream, no refresh. That's exactly what a renter checks before handing over sixty thousand."

## Shot 6 — Close (1:45–2:10)
**Do:** `/about` — scroll slowly past the query list and the "Postgres / IPFS / API" section, stop on the last line.

**Say:**
> "Every record expires in about thirty months — the history outlives this app, not the person. Postgres can be edited by whoever runs it. This can't. SafeStay — deposit history landlords can't rewrite."

---

## Cut list if it still runs long
1. **Shot 3's pause** — trim the explorer hover to a 3s flash (−5s).
2. **Shot 4's form detail** — cut to submit + success card (−10s), mention the hash in VO only.
3. **Cold open** — start on Shot 2's click, hero VO over the dossier (−8s). Hero interaction is the flashiest asset though — cut this last.

## Optional insert — live feed (adds ~15s, only if under time)
Between shots 3 and 4: `/feed` — "There's also just a live feed of everything hitting the chain — terms, outcomes, evidence, newest first." Scroll it slowly.

## Do NOT show on camera
- `.env.local`, private keys, seed-script key material
- Browser chrome with personal bookmarks; anything outside the app viewport

## Numbers a judge will fact-check (all live on-chain)
- Sunrise PG `0x99Ba…24f7`: 5 outcomes / 5 terms / 24% returned / ₹1.4L promised / ₹34,000 returned / ₹1.1L withheld / 5-of-5 verified
- Skyline Towers `0x5cf8…b2D3`: 3 terms / 2 outcomes / 1 awaiting
- The write = `executeBatch` — one tx hash, two entity keys, both shown in the success card
- Every entity link resolves at `tiramisu.explorer.arkiv.network/entity/<key>`
