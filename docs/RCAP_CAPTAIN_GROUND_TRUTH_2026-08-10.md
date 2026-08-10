# RCAP Captain Ground Truth — 2026-08-10

Every claim below was checked against this repository at commit `2dced50`. Where
a fact could not be checked from here, it says so instead of guessing.

## What could not be verified from this session

This session is a single ephemeral cloud container. It has no production
credentials, no Vercel access, no Supabase connection, no local desktop, and no
ability to open parallel desktop sessions. The following parts of the directive
are therefore **unverified**, not confirmed and not contradicted:

- production deployment SHA, deploy history, Vercel plan, auto-deploy state
- Supabase object presence, the migration ledger, the We Must Vote row
- whether a real browser request against production now succeeds
- the state of any other machine, worktree or session

Anything below marked **verified** was run or read here.

## Known-fact reconciliation

| # | Recorded fact | Finding |
|---|---------------|---------|
| 1 | Checkpoint `3b6f4c1`, integration branch `feat/record-clearing-production-integration` | **Contradicted.** HEAD is `2dced50` (merge of PR #88). Neither `3b6f4c1` nor the integration branch exists on this remote; the only branches are `main` and `claude/rcap-nationwide-build-pkbkeh`. |
| 1 | 51/51 jurisdictions normalized | **Verified.** 51 compiled profiles in `src/lib/rcap-engine/compiled/profiles/`; `data/rcap-all50/all-state-build-manifest.json` records 51 states, all at `state_built`. |
| 1 | 497 tracks represented once | **Contradicted.** The compiled profiles yield **324** pathways across 51 jurisdictions (min 3, max 18 per jurisdiction). No 497-track registry exists anywhere in the repository. Registered as external item 10. |
| 3 | `pdf` route rendered per request through `chromium.launch`, cannot run on Vercel | **Verified, now fixed.** `src/lib/rcap/documents/packet-pdf.ts:15` launched Chromium; the download route called it per request. Replaced this session. |
| 3 | `templatePathFor` defaults every unlisted jurisdiction to the Mississippi template | **Verified, now fixed.** `packet-pdf.ts:71-77` returned the Mississippi template for every state outside TX/PA/DC/IL. The serving path no longer reaches it, and unsupported jurisdictions now fail closed. |
| 3 | A browser-free pdf-lib renderer exists wired to nothing | **Verified.** `src/lib/record-clearing/renderers/overlay-renderer.ts` is reachable only from `official-pdf-renderer.ts` → `record-clearing/index.ts`, never from a request path. It renders overlays onto official PDFs and is a different job from the packet document; left alone. |
| 3 | `packet-generation.ts` frozen by a verifier that is not in the npm test chain | **Verified, now fixed.** The script existed as `expungement:verify-dtc-flow-unchanged` and appeared in no workflow and no test chain. Added to `npm test`; it passes. |
| 3 | No redirect after form save | **No longer true.** PR #88 (`7134f6c`) navigates all five jurisdiction forms to the created document on submit. Save-for-later still stays on the form, by design. |
| 4 | Internal `/internal/*` unreachable from a browser; fixed in PR 86 | **Verified as merged.** PR 86 is in history (`9250ad1`) with `verify-internal-admin-browser-access.mjs` in the test chain. Live browser behaviour unverified from here. |
| 5 | `partner_entitlement` is screening-shaped, no packet columns, no `pause_at_cap`/`overage_enabled` | **Verified.** `supabase/phase-35-rcap-partner-entitlement.sql:5-15` has `screenings_allowed`, `screenings_used`, `contract_note`, `period_label`, timestamps and nothing else. Cap logic has nowhere to read a pause flag from. |
| 5 | Packet accounting has no callers | **Verified.** No `packet_render_jobs`, no packet-credit table, no resolver-driven accounting anywhere in `src/`, `scripts/` or `supabase/`. |
| 7 | `verify-all51-launch-enabled` forces all 51 to enable together | **Verified.** It requires all 51 promotion records to be `approvedForLive`, `liveEnabled` and `promotionStatus: live` simultaneously. Not yet deleted — deleting it is coupled to writing its two replacements, which is the next job. |
| 7 | all50/all51 verifiers check artifacts with zero render references | **Verified.** `verify-all51-final-approval.mjs` has 0 render/pdf references across 211 lines; `verify-all50-build.mjs` has 1 across 135. |
| — | The five legacy generator verifiers | **New finding.** `verify-{mississippi,dc,illinois}-document-generator.mjs` fail on baseline `2dced50`, before any change this session, because they load `src/lib/rcap/documents/<state>/generator.ts`, which does not exist. They are in no test chain, so nothing caught it. Confirmed by stashing all changes and re-running. |

## Credential and workspace audit (S6)

**Verified clean.** No production secret is present in this workspace:

- the only env file is `.env.example`; `.gitignore` excludes `.env*`
- the shell carries `GH_TOKEN`, `GITHUB_TOKEN`, `CLOUDSDK_AUTH_ACCESS_TOKEN` and
  `AWS_SECRET_ACCESS_KEY`, all with the value prefix `proxy-` — harness proxy
  placeholders, not credentials for any LegalEase production system
- no Vercel token, no Supabase service key, no Stripe key, live or otherwise

This is one container. It says nothing about any other machine.

## Serving path (S2)

The deployed serving path was broken exactly as recorded, and the break was in
the renderer, not the wiring: the download route called Playwright per request,
so on a serverless runtime with no browser the download could only 500.

Rebuilt this session:

- `src/lib/rcap/documents/packet-document-renderer.ts` — pdf-lib renderer, no
  browser, no subprocess, no outbound network. Letter geometry, measured text
  wrapping with character-level splitting so nothing is clipped, WinAnsi
  sanitisation so a stray character cannot throw mid-download, and protected
  blocks (signature, clerk, court order) emitted as labelled blank space.
- `src/lib/rcap/documents/packet-route-resolver.ts` — one `resolvePacketRoute`
  returning `factory_v2 | legacy_verified | guidance_only | typed_stop |
  disabled`. Unknown fails closed. A jurisdiction with no certified renderer is
  never sellable and never credit-consumable.
- The download route resolves before it renders, refuses unsupported
  jurisdictions with 409, and validates the bytes carry a PDF header before
  serving them.
- `scripts/verify-rcap-packet-render-path.mjs` — renders real bytes, parses them
  back with pdf-lib, asserts page count and Letter geometry, asserts the full
  packet is longer than the court packet, asserts non-WinAnsi input still
  renders, and asserts the resolver never resolves an unknown state to
  Mississippi. In `npm test`. Passes.

**What this does not yet prove.** This is a validated render, not a validated
delivery. Storage, durable render jobs, credit-after-`artifact_validated`, the
HTTP-level verifier against a running deployment, and Roger's phone acceptance
test are all still open. The Milestone 1 gate item 1 is **not** met.

## Completion ledger v1 (S3)

`data/rcap-all50/completion-ledger.json`, generated by
`scripts/generate-rcap-completion-ledger.mjs` from the compiled profiles and
classified by the same resolver the serving path uses.

| Metric | Value |
|--------|-------|
| jurisdictions | 51 |
| tracks | 324 (declared 497 — unreconciled) |
| tracksTerminal | 50 / 324 |
| level 1 (certified packet route) | 49 |
| level 2 (built terminal treatment) | 1 |
| level3TracksRemaining | 274 |
| sellable tracks | 49 |
| creditConsumable tracks | 49 |

Level 2 is claimed only where there is machine-checkable evidence of the
participant treatment. Per-track guidance evidence does not exist in the
repository, so guidance routes are recorded at level 3 with `guidanceEvidence:
null` rather than assumed complete. That number will move as evidence lands, not
as confidence grows.

## Next executable actions, in order

1. Durable render jobs and private storage: `packet_render_jobs` schema, the
   worker contract, and `artifact_validated` before any credit moves.
2. Packet-credit accounting on the known-fact-10 schema, replacing the
   screening-shaped `partner_entitlement`.
3. Route the remaining generation consumers through `resolvePacketRoute`, so it
   is the only path, not merely the correct one.
4. Replace `verify-all51-launch-enabled` with `verify-national-jurisdiction-experience`
   and `verify-route-packet-readiness`, then delete it.
5. Repair or retire the five broken legacy generator verifiers and put the
   survivors in the test chain.
