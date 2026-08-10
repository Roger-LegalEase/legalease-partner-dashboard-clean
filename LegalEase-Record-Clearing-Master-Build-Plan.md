# LegalEase / Expungement.ai — Master Build Plan
### Record-Clearing Engine, Multi-State Rollout, and Two-Agent Build System

**Owner:** Roger Roman
**Prepared as:** durable reference / plan of record
**Production baseline at time of writing:** `fdb0dc3 fix(billing): prevent Stripe invoice reconciliation regressions`
**Live URL:** https://legaleasepartner.com

---

## 0. How to read this document

This is the plan of record. It is meant to be stored, version-controlled if you want, and handed to either coding agent (Claude Code or Codex) as the source of truth. It supersedes the various planning documents that accumulated in chat (the 50-state greenfield prompt, the early fixed-tier Stripe build, etc.). Where those conflict with this, **this wins.**

The plan has three layers:

1. **What is already done** (so no one rebuilds it).
2. **The architecture decisions** (so both agents build the same system).
3. **The build sequence** (so work happens in the right order without collisions).

The governing principle throughout, carried from the entire build so far:

> **Easy to deploy ≠ safe to deploy.** Verify the running state, prove the wrong thing is blocked (not just that the happy path works), and never put an unverified record-clearing artifact in front of a real person. The harm from a defective filing lands on someone trying to clear a record that is blocking their job or housing. Correctness is the product.

---

## 1. Current state — what is ALREADY built (do not rebuild)

### 1.1 Platform core (DONE, live)
- Next.js 16 App Router on Vercel, Supabase (auth + data + RLS), Stripe test-mode (invoice-only).
- Partner sign-in (Supabase Auth), partner dashboard (`/partner/dashboard`), partner team management (`/partner/team`, `/partner/team/invite`).
- Partner identity resolved from authenticated session only — never from query params, headers, or path. Cross-partner isolation verified with real sessions.
- Internal admin routes protected by BOTH proxy-level bearer token AND Supabase `internal_admin` role check.
- No service-role Supabase usage in any client-facing partner path.

### 1.2 Pilot/intake system (DONE)
- Public pilot request (`/request-pilot`, `/api/request-pilot`) with server validation, honeypot, rate limiting, no row-data returned.
- Internal pilot queue (`/internal/pilot-requests`) with status updates; partner users cannot read or mutate it.

### 1.3 Partner dashboard / RLS isolation (DONE, verified)
- Session-derived, RLS-backed reads. Tampering does not change resolved identity.
- We Must Vote dashboard scoped to WMV only via server-side baseline (`WE_MUST_VOTE_METRICS_START_AT` — **known debt, see §6**).
- No fake metric literals, no dead placeholder actions, no dev-URL links.

### 1.4 RCAP document workflows (DONE — these are the LEGACY generators)
Routes live:
- `/api/rcap/intake/{start,respond,complete}`
- `/api/rcap/documents/[packetId]` and `/generate`, `/save`, `/update`, `/pdf/[pdfType]`
- Jurisdiction generators: `/api/rcap/documents/{illinois,mississippi,pennsylvania,texas-harris,dc}/create`

**These are the currently-working states. They must keep working. The new engine does NOT replace them until a verified replacement exists per state.**

### 1.5 Partner billing (DONE — invoice-only model, this was the big recent phase)
- Model: **invoice-only, internal-admin-controlled.** No public checkout, no Payment Links, no Checkout Sessions, no fixed price IDs, no auto-send, no auto-charge.
- Tables: `public.partner_billing_requests`, `public.processed_stripe_events` (RLS on, no broad public policies).
- Flow: internal admin scopes a deal at `/internal/billing/new` → server validates amount → inserts draft → Stripe customer find/create → invoice item → invoice (`collection_method: send_invoice`, `auto_advance: false`) → finalize → store hosted URL. **Invoice NOT auto-sent (admin sends URL manually — intentional).**
- `POST /api/partners/checkout` returns **410** (public checkout disabled).
- Webhook (`/api/stripe/webhook`): raw body via `request.text()`, signature verified, missing/invalid signature rejected. Handles `invoice.{finalized,paid,payment_failed,voided}`.
- Idempotency via `processed_stripe_events`; supported events marked processed ONLY after verified reconciliation.

### 1.6 Billing reconciliation bug — FOUND AND FIXED (`fdb0dc3`)
- **Bug:** `invoice.paid` correctly set `paid`, then a later `invoice.finalized` event REGRESSED the row back to `invoice_created` and cleared `paid_at`. (A paid invoice silently showed unpaid.)
- **Fix:** `src/lib/partners/billing-reconciliation.ts` — `invoice.finalized` no longer regresses terminal states (`paid`/`payment_failed`/`voided`/`canceled`). Lookup prefers `metadata.partner_billing_request_id`, falls back to `stripe_invoice_id`. No-matching-row and zero-row updates FAIL and are NOT marked processed (so Stripe retries). Stale-but-unpaid row repairs to paid.
- Regression coverage: `scripts/test-billing-reconciliation.mjs`.
- Smoke verified in test mode: row `paid`, `paid_at` non-null, idempotent on duplicate.

### 1.7 Open platform items (NOT done — tracked in §6)
- **Toni's invite** — NOT sent (intentionally paused).
- **Stripe is TEST MODE** — live keys + live webhook registration not done.
- **GA/NY state packs** — parked on branch `state-packs-georgia-ny-wip` (`c230b8a`), NY has a TS error, NY approach abandoned (being redone fresh).
- **WMV baseline hardcode** — `WE_MUST_VOTE_METRICS_START_AT` is a temporary per-slug hardcode; should become a `partner_records.metrics_start_at` column.

---

## 2. The record-clearing architecture (what we are building)

### 2.1 The core realization
Record-clearing relief is NOT one shape across states. Lawrence's two classification passes established **three strategies**, assigned **per relief track per state** (not per whole state):

| Strategy | Grade | What it does | Renderer |
|---|---|---|---|
| `custom_pleading` | D | Engine generates a compliant petition/motion from structured data | CustomPleadingRenderer |
| `official_pdf_fill` | A / C | Fill the state's official PDF (overlay or AcroForm) | OfficialPdfRenderer |
| `process_guidance` | n/a | Guide the user through an agency system/portal; produce prep-data, NOT a filing | GuidanceRenderer (reuses NY "Output Type 2" pattern) |

**Why three, not two:** some states (NJ eCourts, FL/KY certificate steps, HI AG process, SC solicitor) run relief through an agency *system*, not a court filing you generate. For these you must NOT generate a filing — you guide.

### 2.2 Lawrence's classification (the airtight pass — governs build order)

**Airtight pleading (10) — build first, lowest risk, no overlay:**
CA, DC, IN, KS, ND, OK, PA, TX, VA, WY

**Pleading WITH local/county guardrails (5) — build pleading + local-form fallback:**
AZ, MS, NV, OH, WA

**Mandatory official form (27 + MN) — require overlay/field-map:**
AL, AK, AR, CO, CT, DE, FL*, HI*, ID, IA, KY*, LA, ME, MD, MA, MI, MN, NE, NH, NJ*, NM, NC, RI, SD, UT, VT, WV, WI
(*FL, HI, KY, NJ also have agency-process components → may be `process_guidance` for parts)

**Hybrid (6) — per-track mix of overlay + pleading:**
GA, MO, MT, OR, SC, TN

**Reclassified / needs care:**
- **IL** — NOT clean pleading (statewide approved forms courts must accept). Needs more than pleading-only.
- **NY** — HYBRID (160.58 = motion/no form; 160.59 = official packet). Record-type dependent. (This is the NY build already scoped — sealing not expungement, five mechanisms, Output Type 1 petition + Output Type 2 guidance.)
- **MN** — reclassified to mandatory official form (EXP 102 + 105/106/107 are "must").

### 2.3 PDF reality (from inspection — 228 PDFs)
- acroform_clean: **3** / acroform_dirty: 103 / xfa: 1 / flat: 3 / scanned: **112** / encrypted: 6
- Conclusion: **overlay-first**, not AcroForm-first. AcroForm fill is the convenience case (3 PDFs). Overlay + manual visual QA is the real path for official-form states.
- **Field-maps for the 27 overlay states are NOT yet built.** Building one = place coordinates on a (often scanned) PDF + visually confirm each field lands in the right box. Serial, human-verified, not parallelizable.

### 2.4 Template grade + lifecycle model
**Grades:** A=official PDF unaltered, B=authorized duplicate, C=local official form, D=legal-ops-approved custom pleading, E=HTML replica/unverified.

**Lifecycle:** `legacy_live` (existing generator, serves through old route only) → `shadow_only` (new engine runs, not user-facing) → `preview_only` → `replacement_candidate` (built, unverified) → `verified_replacement` (passes E2E + counsel) → `retired`.

**The key rule that prevents regression:**
> Grade E + `legacy_live` keeps serving existing live states through the OLD route. Grade E + new engine final output is BLOCKED. New-engine final output is allowed ONLY for A/B/C/D at lifecycle `verified_replacement` with QA passed. No legacy generator is retired until its replacement is `verified_replacement` and a feature flag flips.

### 2.5 Shared engine, two products
- One shared engine: `src/lib/record-clearing/` — jurisdiction registry, workflow router, packet planner, form-authority registry, the three renderers, QA engine, audit manifest.
- Two product adapters: **RCAP** (partner-assisted) and **Expungement.ai** (consumer). Same legal engine; product differences live in config/copy/cover-sheets only. **Court/agency forms are NEVER branded.**

### 2.6 Non-negotiable legal/UPL rules (both products, every state)
- Correct relief vocabulary per state (sealing ≠ expungement ≠ set-aside ≠ annulment ≠ vacatur ≠ shielding). QA asserts it as a HARD failure, not a warning.
- "May be eligible" framing; no outcome guarantees. Court discretion noted where it applies.
- No manual seals/logos. No invented form numbers, statutes, URLs, or revision dates.
- "Sealing is not erasure" type disclosures where the relief is not true erasure; immigration-consequence flag where relevant.
- Hash the BLANK official source PDF only — never the filled/flattened output — for source-change detection.
- XFA detected explicitly; never silently claim an XFA fill succeeded.

---

## 3. The two-agent build system

### 3.1 Principle
**Two agents, two worktrees, two branches, zero shared live files. You are the single merge point.** Neither agent pushes to main, applies a migration, deploys, or touches production. You review every diff and merge one branch at a time.

### 3.2 Agent assignments

**Agent A — Claude Code — "Engine/Pleading Dev"**
- Owns: `src/lib/record-clearing/**`, the pleading renderer, the 10 airtight states, PDF inspection/ingest scripts, record-clearing verifiers.
- Worktree: `/workspaces/worktrees/record-engine` — Branch: `feat/record-engine`
- Rationale: greenfield, shadow-mode, highest leverage (covers the most states fastest via the pleading path), lowest collision with live code.

**Agent B — Codex — "Overlay/Legacy Dev"**
- Owns: the overlay renderer + the official-form states (piloted on Nebraska), and the existing `src/lib/rcap/**` legacy generators it already knows.
- Worktree: `/workspaces/worktrees/launch-states` — Branch: `feat/launch-states`
- Rationale: familiar with existing RCAP patterns; takes the slow, serial, visually-verified overlay work.

### 3.3 Shared-seam files (NEITHER agent edits without you)
`package.json`, `AGENTS.md`/`CLAUDE.md`, the jurisdiction registry (Agent A owns; B reads), shared types, `.gitignore`, `.env.example`, any Supabase migration. If a task needs one, the agent STOPS and asks. This is where parallel agents corrupt each other.

### 3.4 Forbidden for BOTH (always-gate list)
No push to main. No migration applied (write SQL, human applies). No deploy. No `git add .`. No touching billing/auth/admin/Stripe/RLS unless the task IS that. No service-role in client paths. No modifying live legacy generators (engine is shadow-mode). No re-enabling public checkout/Payment Links/Checkout Sessions.

### 3.5 Permissions / autonomy
Auto-approve the SAFE 90% (reads, tests, lint, typecheck, build, writes to the agent's own feature branch, verifiers). HARD-GATE the dangerous 10% (prod Supabase, push to main, migrations, deploys, `git add .`, destructive shell, service-role). Configure via Claude Code allow/deny settings and Codex approval mode. (Pull current Claude Code settings docs before configuring — syntax changes.)

### 3.6 The merge loop
1. You write a detailed, single-scope prompt for ONE agent, scoped to its owned dirs.
2. Agent works in its worktree, runs all checks, reports diff + `git status --short`. Does NOT push/merge.
3. You review the diff (the bug firewall).
4. You merge that branch to main, run verifiers on main, push.
5. The other worktree merges main before its next task.
6. Never have both agents mid-edit on overlapping concerns. Stagger near shared seams.

---

## 4. The build sequence (in order)

### PHASE 0 — Stand up the structure (do first)
0.1 Confirm main clean (`git status --short` empty).
0.2 Save `AGENTS.md` (see §5), commit to main.
0.3 Create both worktrees/branches.
0.4 Configure agent permissions (allow/deny lists).
0.5 Assign agents to worktrees.

### PHASE 1 — Engine skeleton + pleading proof (Agent A)
1.1 Create `src/lib/record-clearing/` skeleton (types, products, jurisdictions, form-authorities, field-maps, packet-planner, renderers/, qa, audit, index) — SHADOW MODE, wired to nothing live.
1.2 Implement template grade + lifecycle model + enforcement.
1.3 Build the **CustomPleadingRenderer** (Grade D): caption, title, statutory authority, eligibility allegations, requested relief, signature/verification/notary, certificate of service, proposed order, attachment list, non-official footer. No seals. No branding on court pages.
1.4 Build the **first airtight pleading state as the template** — recommend **Pennsylvania or Texas** (you have them live-ish, so the renderer is proven against known-good output before net-new states).
1.5 Vocabulary QA as hard assertion. Audit manifest (JSON object first; DB table in Phase 4).
1.6 Verifier: `rcap:verify-pleading-state`. Run lint/typecheck/test/build + existing security verifiers (no regression).
**Gate:** Lawrence confirms the generated PA/TX pleading is legally correct + court-acceptable. You read the output.

### PHASE 2 — Roll the 10 airtight pleading states (Agent A)
2.1 For each of CA, DC, IN, KS, ND, OK, PA, TX, VA, WY: build the per-state pleading template (driven by that state's reference, not a generic template), correct vocabulary, correct statutory citations.
2.2 Each state: generate sample output → Lawrence verifies correctness → you read it → mark `verified_replacement` → feature-flag on.
2.3 These become the first real launch wave. Ship as each clears — no batch deadline.

### PHASE 3 — Overlay engine proof on Nebraska (Agent B, parallel)
3.1 Confirm the inspection tool is committed (script + test only; gitignore generated reports, raw PDFs, `private/`, zips).
3.2 Build the **OfficialPdfRenderer** overlay-first: overlay (primary), acroform (clean only), hybrid, manual_review. XFA detection BLOCKS fill. Blank-source-hash separate from output-hash. PDF coordinate space is bottom-left origin, Y-up (the silent-misplacement trap).
3.3 Nebraska vertical slice (cleanest real profile: 3 PDFs, 0 scanned/encrypted/xfa). Build field-maps, render.
3.4 **HUMAN VISUAL CHECK:** open the rendered Nebraska PDF and confirm every field lands in the right box. The verifier proving "a PDF was produced" is NOT sufficient — overlay correctness is visual and only a human confirms it.
**Gate:** Nebraska renders visually correct + Lawrence confirms it's the right current form + correct set-aside-not-expungement vocabulary.

### PHASE 4 — Audit manifest DB + guardrail pleading states
4.1 (Migration — human applies) `public.packet_audit_manifests` table, RLS on, **service-role/internal-admin only, no partner read for v1** (money/legal-state default; add scoped partner read later only with adversarial isolation test). Unique/index as needed. Review SQL, apply manually, verify live.
4.2 (Agent A) The 5 guardrail pleading states (AZ, MS, NV, OH, WA): pleading generation PLUS local/county-form fallback logic + a "your court may require a local form — verify" guardrail. Lawrence confirms each.

### PHASE 5 — Process-guidance states (Agent A)
5.1 Build the **GuidanceRenderer** (reuse NY Output Type 2 pattern): for NJ (eCourts), FL/KY (certificate step), HI (AG process), SC (solicitor), and the agency-process parts of GA. Output is accurate process guidance + prep-data, NOT a filing. Lawrence confirms each process description.

### PHASE 6 — Overlay states rollout (Agent B, rolling)
6.1 For each mandatory-official-form state (the 27 + MN): ingest official PDF → inspect/classify → build field-map → shadow render → **human visual check** → Lawrence confirms current form + vocabulary → `verified_replacement` → flag on.
6.2 Sequence by PDF cleanliness (clean AcroForm first, then dirty/overlay, scanned last — scanned may need a sourced replacement or heaviest manual mapping).
6.3 Hybrid states (GA, MO, MT, OR, SC, TN): per-track — overlay the form tracks, plead the pleading tracks, guide the agency tracks.

### PHASE 7 — NY redo + IL/MN reclassification (Agent A/B per track)
7.1 NY fresh on main (abandon the WIP-branch NY): the verified five-mechanism workflow — Output Type 1 (160.59 petition packet) + Output Type 2 (verification guidance for automatic paths). Sealing-not-expungement vocabulary enforced.
7.2 IL: add proper handling for the statewide approved-forms requirement (not clean pleading).
7.3 MN: move to overlay (EXP 102 + 105/106/107 mandatory).

### PHASE 8 — Expungement.ai consumer product (after the engine is proven)
8.1 Consumer adapter on the shared engine. Form-based eligibility (deterministic, reuses the state logic — NOT chat). Wilma = general-questions assistant ONLY, walled off from eligibility/legal advice, single cheap model, guardrails adversarially tested.
8.2 Consumer payment gate: reuse the hardened invoice/webhook LEARNINGS (idempotency, fail-on-write-retry, persist-eligibility-record-before-checkout-with-ID-in-metadata, never trust query-param success). Consumer flow = eligibility record → checkout → webhook confirms → generate packet → deliver. Test-mode round-trip + duplicate-event test before real money.
8.3 Decisions to lock at Phase 8 start: separate repo vs same app (lean separate); shared state-engine package (lean shared); domain/Supabase/Vercel; consumer accounts vs guest. SOC 2 = "readiness posture," never a launch claim. Pen testing as its own task.

---

## 5. AGENTS.md (commit this to main before branching)

```
# AGENTS.md — Build Discipline (both agents obey)

## Never (stop and ask):
- Never push to main. Work only on your assigned feature branch.
- Never apply a Supabase migration. Write the SQL, report it, human applies.
- Never delete or write to production/live database tables.
- Never deploy.
- Never use `git add .` — add files explicitly by path.
- Never touch billing, auth, admin, Stripe, or RLS unless the task explicitly says so.
- Never modify the live legacy generators (src/lib/rcap document routes). The new engine is SHADOW-MODE.
- Never re-enable public checkout, Payment Links, or Checkout Sessions.
- Never add product branding to court/agency form pages.
- Never add seals/logos manually.
- Never invent form numbers, statutes, source URLs, or revision dates.
- Never edit shared-seam files (package.json, jurisdiction registry, shared types,
  .gitignore, .env.example) without explicit instruction — stop and ask.

## Always:
- Verify the DEPLOYED/running state, not just "build passed."
- Prove security adversarially: show the WRONG user/input is DENIED, not just the happy path.
- Run lint, typecheck, test, build, and relevant verifiers before reporting done.
- Single-scope work. Report `git status --short` and the diff. Do not commit until reviewed.
- Hash blank source PDFs only, never filled output.
- Overlay-first PDF rendering. Detect XFA explicitly; never silent-fail an XFA fill.
- PDF coordinate space is bottom-left origin, Y increases upward.
- Per-state relief vocabulary is a HARD QA assertion (NY=sealing, NE=set-aside,
  NH=annulment, WA=vacate, ID=shielding, etc.), not a warning.
- New-engine final output only for grades A/B/C/D at lifecycle verified_replacement with QA passed.

## Ownership:
- Agent A (Claude Code): src/lib/record-clearing/**, pleading renderer, the 10 airtight
  states, PDF scripts, record-clearing verifiers.
- Agent B (Codex): overlay renderer + official-form states (Nebraska pilot), src/lib/rcap/**.
- Shared files: human-owned. Stop and ask.

## Mississippi:
- Legacy MS route stays LIVE. MS is EXCLUDED from the new engine selector.
  Never conflate the two. Never break the legacy MS route.

## Three strategies per relief track:
- custom_pleading (Grade D): engine generates the document.
- official_pdf_fill (Grade A/C): overlay the official PDF.
- process_guidance: guide through an agency system; produce prep-data, NOT a filing.
```

---

## 6. Open items / debt register (do not lose)

| Item | Status | Action |
|---|---|---|
| Toni's invite | Not sent (paused) | Send when ready; first real partner |
| Stripe live mode | Test-mode only | Set live keys + register live webhook in Stripe dashboard before real billing |
| GA/NY WIP branch | Parked `c230b8a`, NY abandoned | Cherry-pick GA later; NY redone fresh (Phase 7) |
| WMV baseline hardcode | `WE_MUST_VOTE_METRICS_START_AT` | Replace with `partner_records.metrics_start_at` column at templatization |
| Test-suite audit | Unaudited | Confirm `npm test` is real coverage, not thin |
| Backups / PITR | Unconfirmed | Confirm Supabase point-in-time-recovery is ON (holding criminal-record data) |
| Error alerting | Logs only | Add Sentry-class alerting with PII scrub before scale |
| Public-form synthetic check | One-time smoke | Add periodic check that `/request-pilot` still accepts |
| Internal token rotation | Rotated once | Confirm rotation propagated (old dead, new live) |

---

## 7. The gates that never get skipped (even under pressure)

1. **Counsel sign-off per state** before that state's output goes live. Classification is done; output correctness is per-state.
2. **Human visual check** of every overlay render before it goes live. Coordinates pass automated tests while being visually wrong. Only eyes confirm the field is in the right box.
3. **Your diff review** before every merge. Two agents producing unreviewed code is how bugs ship.
4. **Migrations reviewed + applied manually + verified live.** No agent applies a migration.
5. **Test-mode round-trip (incl. duplicate-event)** before any real payment, for both RCAP billing going live and the future consumer gate.
6. **Vocabulary correctness** as a hard QA failure, per state.

A state is "launchable" when: counsel confirmed + output verified (read/eyeballed) + vocabulary QA passes + (for overlay) visual check passed + lifecycle `verified_replacement`. Not before.

---

## 8. One-paragraph summary

The platform (partner dashboard, RLS isolation, pilot intake, invoice-only billing with a hardened idempotent webhook) is DONE and live. The next build is a shared record-clearing engine, in shadow mode, that generates relief documents via three strategies — engine-generated pleadings (10 airtight states first, the cheap path), official-PDF overlay (27 states, the slow visually-verified path, piloted on Nebraska), and process-guidance (agency-portal states, no filing generated). Two agents build in parallel in separate worktrees with you as the single merge point: Claude Code on the pleading engine and airtight states, Codex on the overlay engine and official-form states. Legacy generators keep serving until a verified replacement exists per state. Every state ships only after counsel sign-off and human verification — no batch deadline, done when it's done. The same engine then becomes the foundation for the consumer Expungement.ai rebuild, reusing the hardened payment learnings.
```
