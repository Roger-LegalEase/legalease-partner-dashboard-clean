# LegalEase / Expungement.ai — Master Build Plan (v3)
### Record-Clearing Engine, Multi-State Rollout, and Two-Agent Build System

**Owner:** Roger Roman
**Status:** Plan of record. Supersedes all prior chat planning, v1, and v2 of this plan.
**Production baseline:** `fdb0dc3 fix(billing): prevent Stripe invoice reconciliation regressions`
**Live URL:** https://legaleasepartner.com

> **v2 changes:** current continuation point added; engine skeleton + Nebraska slice moved to DONE; Agent B ownership corrected (read-not-edit legacy); shared seams split soft/hard; counsel sign-off is now a stored artifact; source-freshness gate added; explicit live-routing/selector gate added; readiness prerequisites attached to go-live (not to shadow building).
>
> **v3 changes:** corrected legal research-source hierarchy with Nationwide as the counsel-researched source of truth; added three-tier state build pattern; added state-pack read-only/fidelity rule; clarified that legacy generators are flow/output references only and must not be used as citation authority; added Pennsylvania correction note requiring PA config to check state-pack fidelity against Nationwide, then import the structured PA state pack.

---

## ★ CURRENT CONTINUATION POINT (read this first)

**Already done and in the working tree (do NOT rebuild):**
- The record-clearing shadow module exists: `src/lib/record-clearing/` (types, products, jurisdictions, form-authorities, field-maps, packet-planner, qa, audit, index, and renderers: official-pdf-renderer, overlay-renderer, acroform-renderer, xfa-detector, render-utils).
- PDF inspection + ingest scripts exist; 235 PDFs classified (4 acroform_clean, 107 dirty, 1 xfa, 3 flat, 114 scanned, 6 encrypted).
- Nebraska shadow-mode vertical slice exists; verifier `rcap:verify-nebraska-shadow` passes.
- Nebraska CC 6:11, CC 6:11.2, CC 6:12 inspected (all acroform_dirty → hybrid). Shadow render produced, but **NO field maps yet** → status `ready_for_human_visual_mapping`.

**The two next active tasks (parallelizable under the conditions below):**
1. **(Human + optional Agent B) Nebraska CC 6:11 visual field-mapping, shadow only.** Build the field-map (AcroForm field targets and/or overlay coordinates), render a review PDF, and VISUALLY confirm each field lands in the right box. This is the gate that proves the overlay pattern.
2. **(Agent A) Pennsylvania pleading renderer.** Build the CustomPleadingRenderer + PA airtight pleading state.

**Nebraska status path (do NOT skip steps):**
```
shadow_only → visual_review_required → replacement_candidate
```
Nebraska CC 6:11 becomes `visual_review_required` once a field-map review PDF is generated. It becomes `replacement_candidate` ONLY after ALL of:
- field-map review PDF generated
- human visual check completed (fields land in the right boxes)
- source-freshness recorded
- vocabulary QA passed (set-aside ≠ expungement)
- Lawrence confirms correct current form + Nebraska set-aside vocabulary

**Parallel-safety conditions (these two tasks share the `src/lib/record-clearing/**` directory, so parallel is safe ONLY if):**
- Agent B limits edits to Nebraska field-map / Nebraska manifest / Nebraska verifier files.
- Agent A limits edits to CustomPleadingRenderer / Pennsylvania config / pleading verifier files.
- NEITHER refactors shared types, the jurisdiction registry, or renderer interfaces during the parallel window. (If one must, pause the other first.)

**Do NOT start a SECOND overlay state until Nebraska CC 6:11 has a real review PDF and you visually confirm the fields land correctly.** One mapped state teaches the per-form cost; two half-mapped states teach nothing.

---

## 0. Governing principle

> **Easy to deploy ≠ safe to deploy.** Verify the running state, prove the wrong thing is blocked, never put an unverified record-clearing artifact in front of a real person. The harm from a defective filing lands on someone trying to clear a record blocking their job or housing. Correctness is the product. Done when it's done — no batch deadline.

### 0.1 Research-source hierarchy
**Core rule:** Do not re-derive legal content from legacy generators when the Nationwide source, a structured state pack, Wilma RTF, official PDF, official HTML, or official statute source exists.

Legal content must flow from the strongest available source, in this order:
1. `private/Nationwide Record Clearing/` is the counsel-researched, counsel-overseen source of truth for legal content: eligibility, workflows, forms, rules, citations, vocabulary, waiting periods, required fields, safety language, and filing instructions.
2. `src/lib/rcap/state-packs/<state>/` are the coded form of Nationwide research for states that already have state packs. Import them directly where available.
3. If a state pack and the Nationwide source conflict, Nationwide wins. The discrepancy is a state-pack fidelity bug to fix against Nationwide, not an open legal question.
4. Official PDFs / HTML / statutes inside Nationwide are used to create or refresh state packs.
5. Legacy generators are flow/output references only. They are never citation authority and must not be used to re-derive legal content.
6. If neither a state pack nor Wilma RTF exists, build a state pack from official source materials before wiring a renderer.

`src/lib/rcap/state-packs/**` are shared research assets consumed by both legacy generators and the new engine. They are read-only unless a task explicitly authorizes a fidelity correction against the Nationwide source. Neither agent may casually edit a state pack because a change can affect both consumers.

The per-state gate is source fidelity, not re-approval of the law. The build must faithfully reflect the Nationwide source: nothing dropped, nothing altered, nothing invented. Separate overlay visual QA still confirms text lands in the right boxes.

---

## 1. Already built (do not rebuild)

### 1.1 Platform core (DONE, live)
Next.js 16 / Vercel / Supabase (auth+data+RLS) / Stripe test-mode invoice-only. Partner sign-in, dashboard (`/partner/dashboard`), team mgmt (`/partner/team`, `/partner/team/invite`). Identity from session only. Cross-partner isolation verified. Internal admin = proxy bearer + `internal_admin` role. No service-role in client paths.

### 1.2 Pilot/intake (DONE)
`/request-pilot`, `/api/request-pilot` (validation, honeypot, rate limit, no row-data returned). Internal queue `/internal/pilot-requests`; partner users blocked.

### 1.3 Dashboard / RLS isolation (DONE, verified)
Session-derived, RLS-backed. Tampering doesn't change identity. WMV scoped via `WE_MUST_VOTE_METRICS_START_AT` (debt → §6). No fake literals, no dev URLs.

### 1.4 RCAP legacy generators (DONE — LEGACY, keep serving)
`/api/rcap/intake/{start,respond,complete}`, `/api/rcap/documents/[packetId]{,/generate,/save,/update,/pdf/[pdfType]}`, and `/api/rcap/documents/{illinois,mississippi,pennsylvania,texas-harris,dc}/create`. **These keep working until a verified replacement exists per state.**

### 1.5 Invoice-only billing (DONE)
Internal-admin only. No public checkout / Payment Links / Checkout Sessions / fixed prices / auto-send / auto-charge. Tables `partner_billing_requests`, `processed_stripe_events` (RLS, no broad public). Flow: `/internal/billing/new` → validate → draft → Stripe customer → invoice item → invoice (`send_invoice`, `auto_advance:false`) → finalize → store hosted URL (not auto-sent). `POST /api/partners/checkout` = 410. Webhook: raw body, signature verified, handles `invoice.{finalized,paid,payment_failed,voided}`, idempotent via `processed_stripe_events`, processed only after verified reconciliation.

### 1.6 Billing reconciliation bug FIXED (`fdb0dc3`)
`invoice.finalized` no longer regresses terminal states (`paid`/`payment_failed`/`voided`/`canceled`). Lookup prefers `metadata.partner_billing_request_id`, falls back to `stripe_invoice_id`. No-matching-row / zero-row fail and are NOT marked processed (Stripe retries). Coverage: `scripts/test-billing-reconciliation.mjs`. Test-mode smoke verified.

### 1.7 Record-clearing shadow engine + Nebraska slice (DONE — see Continuation Point)
Shadow module, renderers, inspection, Nebraska slice, Nebraska verifier. Nebraska = `ready_for_human_visual_mapping` (no field maps yet).

---

## 2. Architecture

### 2.1 Three strategies per relief track
| Strategy | Grade | Output | Renderer |
|---|---|---|---|
| `custom_pleading` | D | engine-generated petition/motion | CustomPleadingRenderer |
| `official_pdf_fill` | A/C | filled official PDF (overlay/acroform) | OfficialPdfRenderer |
| `process_guidance` | n/a | agency-process guidance + prep-data, NOT a filing | GuidanceRenderer (NY Output-Type-2 pattern) |

### 2.2 Lawrence's classification (governs build order)
- **Airtight pleading (10):** CA, DC, IN, KS, ND, OK, PA, TX, VA, WY
- **Pleading + local/county guardrails (5):** AZ, MS, NV, OH, WA
- **Mandatory official form (27 + MN, overlay):** AL, AK, AR, CO, CT, DE, FL*, HI*, ID, IA, KY*, LA, ME, MD, MA, MI, MN, NE, NH, NJ*, NM, NC, RI, SD, UT, VT, WV, WI (*also agency-process parts → `process_guidance`)
- **Hybrid (6, per-track mix):** GA, MO, MT, OR, SC, TN
- **Reclassified:** IL (not clean pleading — statewide approved forms courts must accept), NY (hybrid — 160.58 motion/no-form + 160.59 official packet; sealing-not-expungement), MN (→ mandatory form, EXP 102 + 105/106/107)

### 2.3 PDF reality
235 PDFs: 4 clean / 107 dirty / 1 xfa / 3 flat / 114 scanned / 6 encrypted. Recommended mapping modes: 4 acroform / 3 overlay / 107 hybrid / 121 manual_review. **Overlay-first; AcroForm is the exception.** Field-maps for overlay states NOT built. Building one = place coordinates on a (often scanned) PDF + human visual confirm. Serial, not parallelizable. **PDF coords: bottom-left origin, Y-up (the silent-misplacement trap).**

### 2.4 Grade + lifecycle
Grades A–E. Lifecycle: `legacy_live` → `shadow_only` → `visual_review_required` (overlay states only — review PDF generated, awaiting human visual check) → `preview_only` → `replacement_candidate` → `verified_replacement` → `retired`. **Grade E legacy_live keeps serving old routes; Grade E new-engine output BLOCKED. New-engine final output only for A/B/C/D at `verified_replacement` + QA passed. No legacy retired until replacement is verified + flag flipped.**

### 2.5 Shared engine, two products
`src/lib/record-clearing/` shared. RCAP (partner-assisted) + Expungement.ai (consumer) adapters. Court/agency forms NEVER branded. **Architectural invariant: RCAP partners can NEVER see consumer Expungement.ai records — hard isolation.**

### 2.6 Non-negotiable legal/UPL rules
Correct per-state relief vocabulary (sealing≠expungement≠set-aside≠annulment≠vacatur≠shielding) as HARD QA failure. "May be eligible," no outcome guarantees. No manual seals/logos. No invented form numbers/statutes/URLs/dates. Not-erasure + immigration disclosures where relevant. Hash blank source PDF only. XFA detected explicitly, never silent-fail.

---

## 3. Two-agent build system

### 3.1 Principle
Two agents, two worktrees, two branches, zero shared live files. You are the single merge point. Neither pushes to main, applies migrations, deploys, or touches production.

### 3.2 Assignments
**Agent A — Claude Code — Pleading/Engine.** Owns `src/lib/record-clearing/**` pleading path, CustomPleadingRenderer, the 10 airtight states, record-clearing verifiers. Worktree `/workspaces/worktrees/record-engine`, branch `feat/record-engine`.

**Agent B — Codex — Overlay/Official-Form.** Owns the overlay renderer + official-form states (Nebraska pilot), field-map files, shadow verifiers, generated shadow artifacts (gitignored). Worktree `/workspaces/worktrees/launch-states`, branch `feat/launch-states`.
> **Agent B may READ legacy `src/lib/rcap/**` for reference/compatibility, but may NOT edit legacy generators or live routes unless a prompt explicitly authorizes that exact legacy change.** "Owns overlay" ≠ "may patch legacy."

### 3.3 Shared-seam files — split
**Hard shared (STOP and ask — never edit without explicit instruction):**
`package.json`, `.env.example`, Supabase migrations, live RCAP routes, billing/auth/admin/Stripe/RLS, global selector/feature-flag files.

**Soft shared (edit ONLY within explicit task scope — never casually):**
`src/lib/record-clearing/jurisdictions.ts`, `form-authorities.ts`, `field-maps.ts`, shared record-clearing types. (An agent building a state may add its own entry here when the task says so; it may not refactor or touch other states' entries.)

### 3.4 Forbidden for BOTH (enforced by permission config)
No push to main. No migration applied. No deploy. No `git add .`/`-A`/`--all`. No touching billing/auth/admin/Stripe/RLS unless the task IS that. No service-role in client. No modifying live legacy generators. No re-enabling public checkout/Payment Links/Checkout Sessions.

### 3.4.1 State-pack read-only rule
`src/lib/rcap/state-packs/**` are shared research assets consumed by both legacy generators and the new engine. They are read-only unless a task explicitly authorizes a fidelity correction against the Nationwide source. State packs may be imported by new renderers/configs, but legal content must not be copied, re-derived from legacy generators, or silently forked into new config files.

### 3.5 Permissions (`.claude/settings.json`, committed)
Deny→ask→allow, deny wins. `defaultMode: acceptEdits`. Allow: lint/typecheck/test/build, `npm run partners:*`/`rcap:*`, `node scripts/*`, reads/greps/finds, explicit `git add src|scripts|docs`, `git commit`, branch create. Ask: `git merge`/`rebase`. Deny: `git push`, `git add .|-A|--all`, `vercel`, `supabase db push`/`migration up`, `psql`, `rm -rf`, `DROP/DELETE`, reading `.env*`. (Codex: equivalent approval mode — gate push/deploy/migrations, auto-run the rest.)

### 3.6 Merge loop
Detailed single-scope prompt → agent works in worktree, runs checks, reports diff + `git status --short`, does NOT push/merge → you review the diff (bug firewall) → you merge to main, run verifiers, push → other worktree merges main before next task. Never both mid-edit on overlapping concerns.

---

## 4. Build sequence

### 4.0 Three-tier build pattern
**Tier 1: existing state packs.** PA, DC, IL, MS, and TX-Harris already have structured state packs. Import those state packs directly into new-engine configs/renderers. Mississippi remains excluded from the new engine selector unless explicitly authorized.

**Tier 2: Wilma RTF but no state pack.** Convert Wilma RTF / agent-reference research into a structured state pack first. Wire renderers only after the state pack exists.

**Tier 3: bare states.** Official source research → state pack → renderer.

### PHASE 0 — Structure (do first)
Confirm main clean → commit `AGENTS.md` + `.claude/settings.json` → create both worktrees → configure Codex approval mode → assign agents.

### PHASE 1 — Nebraska field-mapping (Human + Agent B) ‖ PA pleading (Agent A)  ← CURRENT
**1A (overlay):** Build Nebraska CC 6:11 field-map (AcroForm targets and/or overlay coords). Render a review PDF → status `visual_review_required`. Then **HUMAN VISUAL CHECK** (each field in the right box) + source-freshness recorded + vocabulary QA passed + Lawrence confirms current correct form + set-aside-not-expungement vocabulary → ONLY THEN `replacement_candidate`. (Status path: `shadow_only → visual_review_required → replacement_candidate`.)
**1B (pleading, parallel):** Agent A builds CustomPleadingRenderer (Grade D) + Pennsylvania config by importing `src/lib/rcap/state-packs/pennsylvania/` directly. The PA renderer structure is useful, but PA config must be reworked to import the PA state pack because the prior config re-derived content from the legacy generator and missed § 9122.1, § 9122.2, Pa.R.Crim.P. 791, Pa.R.Crim.P. 490, and Pa.R.Crim.P. 320. The corrected PA task must first check state-pack fidelity against the PA Nationwide source. Keep the renderer structure, caption, verification, proposed order, certificate of service, audit manifest, and shadow-only behavior, but legal content must come from the PA state pack after fidelity is confirmed or explicitly corrected against Nationwide. Vocabulary QA hard-assert. Verifier `rcap:verify-pleading-state`. → `replacement_candidate`. You read output; Lawrence confirms.
*Parallel-safety: both live under `src/lib/record-clearing/**`. Safe to parallelize ONLY if Agent B stays in Nebraska field-map/manifest/verifier files, Agent A stays in CustomPleadingRenderer/PA-config/pleading-verifier files, and NEITHER refactors shared types, the jurisdiction registry, or renderer interfaces during the parallel window. Do NOT start a second overlay state until 1A has a review PDF and you've visually confirmed it.*

### PHASE 2 — Roll the 10 airtight pleading states (Agent A)
Per state (CA, DC, IN, KS, ND, OK, PA, TX, VA, WY): per-state pleading template (state-reference-driven), correct vocabulary + citations → sample output → Lawrence verifies → you read → record counsel artifact (§7) → `replacement_candidate`. (NOT live-routed yet — see Phase 5 gate.)

### PHASE 3 — Audit manifest DB + counsel-artifact + source-freshness (mixed)
3.1 (Migration, human applies) `public.packet_audit_manifests` — RLS on, **service-role/internal-admin only, no partner read v1**. Includes counsel-artifact fields (§7) and source-freshness fields (§8).
3.2 Wire renderers to write the manifest (incl. reviewer, source URL, access date, blank-source hash, approval type).

### PHASE 4 — Guardrail pleading + process-guidance (Agent A)
4.1 5 guardrail states (AZ, MS, NV, OH, WA): pleading + local/county-form fallback + "verify your court's local form" guardrail.
4.2 GuidanceRenderer + process-guidance states (NJ eCourts, FL/KY cert, HI AG, SC solicitor, GA agency parts): accurate process + prep-data, NOT a filing.

### PHASE 5 — LIVE-ROUTING / SELECTOR GATE (the firewall — gated)
**No state feature flag may route live users until a dedicated selector/integration verifier proves ALL of:**
- unverified states are blocked from new-engine output
- legacy states still route through legacy generators
- Mississippi legacy remains untouched and excluded from the new selector
- no live RCAP route changed unintentionally
- new-engine output is unavailable unless lifecycle = `verified_replacement`

**Go-live prerequisites (must be confirmed before flipping ANY state live to real users):**
- Supabase PITR/backups confirmed ON
- `npm test` confirmed meaningful coverage (audit done)
- PII-scrubbed error alerting in place
- periodic public-form synthetic check running
- internal token rotation state confirmed (old dead/new live)
Shadow building (Phases 1–4) does NOT wait on these; **flipping anything live does.**

### PHASE 6 — Overlay states rollout (Agent B, rolling, post-Nebraska)
Per mandatory-form state (27 + MN): ingest PDF → classify → build field-map → shadow render → **HUMAN VISUAL CHECK** → source-freshness recorded → Lawrence confirms → counsel artifact → `verified_replacement` → (Phase 5 gate) → flag on. Sequence by cleanliness (clean AcroForm → dirty/overlay → scanned last). Hybrid states (GA, MO, MT, OR, SC, TN): per-track.

### PHASE 7 — NY redo + IL/MN (per track)
NY fresh on main (abandon WIP-branch NY): five-mechanism workflow, Output Type 1 (160.59 petition) + Output Type 2 (verification guidance), sealing vocabulary. IL: statewide-approved-forms handling. MN: overlay (EXP 102 + 105/106/107).

### PHASE 8 — Expungement.ai consumer (after engine proven)
**8.0 Consumer privacy/payment threat model FIRST:** guest vs. account retention, abandoned eligibility records, PII deletion/export, packet access after payment, refund/dispute, partner-vs-consumer role separation, and the hard invariant **RCAP partners never see consumer records.**
8.1 Consumer adapter on shared engine. Form-based eligibility (deterministic, NOT chat). Wilma = general-questions only, walled off from eligibility/legal advice, single cheap model, guardrails adversarially tested.
8.2 Consumer payment gate reusing hardened learnings (idempotency, fail-on-write-retry, persist-eligibility-before-checkout-with-ID-in-metadata, never trust query-param success). Test-mode round-trip + duplicate-event test before real money.
8.3 Lock: separate repo vs same app (lean separate); shared state-engine package (lean shared); domain/Supabase/Vercel; accounts vs guest. SOC 2 = readiness posture, never a launch claim. Pen test = own task.

---

## 5. AGENTS.md (commit before branching)
[Use the AGENTS.md block from §5 of v1, WITH these updates:]
- Agent B line: "may READ legacy src/lib/rcap/** for reference; may NOT edit legacy generators or live routes unless the prompt explicitly authorizes that exact legacy change."
- Add soft-shared rule: "Soft-shared files (record-clearing jurisdictions/form-authorities/field-maps/types) may be edited ONLY to add the entry your current task scopes — never refactor or touch other states' entries. Hard-shared files (package.json, migrations, live routes, billing/auth/admin/RLS, selector/flag files): stop and ask."
- Add: "Record a counsel-approval artifact and source-freshness record before any state reaches replacement_candidate (see plan §7, §8)."
- Add: "No feature flag routes live users until the Phase 5 selector/integration verifier passes."
- Add: "`src/lib/rcap/state-packs/**` are shared research assets consumed by both legacy generators and the new engine. They are read-only unless a task explicitly authorizes a fidelity correction against the Nationwide source. Neither agent may casually edit a state pack because a change can affect both consumers."
- Add source hierarchy summary: "`private/Nationwide Record Clearing/` is the counsel-researched source of truth for legal content; state packs are the coded form of Nationwide research and should be imported directly where available; Nationwide wins conflicts, which are state-pack fidelity bugs; official sources inside Nationwide create or refresh state packs; legacy generators are flow/output references only, not citation authority; if neither state pack nor Wilma RTF exists, build the state pack from official source materials before wiring a renderer."

---

## 6. Debt register
| Item | Status | Action |
|---|---|---|
| Toni's invite | Not sent | Send when ready |
| Stripe live mode | Test only | Live keys + register webhook before real billing |
| GA/NY WIP branch | Parked `c230b8a` | Cherry-pick GA; NY redone (Phase 7) |
| WMV baseline hardcode | hardcoded | → `partner_records.metrics_start_at` |
| Test-suite audit | unaudited | Confirm real coverage (go-live prereq) |
| Backups/PITR | unconfirmed | Confirm ON (go-live prereq) |
| Error alerting | logs only | Add PII-scrubbed alerting (go-live prereq) |
| Public-form synthetic check | one-time | Add periodic (go-live prereq) |
| Token rotation | rotated once | Confirm propagated (go-live prereq) |

---

## 7. Counsel-approval artifact (stored, not chat memory)
Every state/track approval recorded in `packet_audit_manifests` (or a linked `legal_approvals` table):
- reviewer name, review date
- jurisdiction, relief track
- source form/statute version
- output sample hash
- approval status
- approval type (legal correctness / visual mapping / both)
- notes
A state cannot be `verified_replacement` without this record.

## 8. Source-freshness gate
Before `replacement_candidate`, the manifest records: official source URL, access date, revision date (if available), blank-source PDF hash, source authority level, reviewer. Re-verify when the source-change hash-watcher flags a mismatch (the hash watcher is the live mechanism; record-at-build is the baseline).

## 9. Gates that never get skipped
1. Counsel sign-off per state (recorded as §7 artifact) before live.
2. Human visual check of every overlay render before live.
3. Your diff review before every merge.
4. Migrations reviewed + applied manually + verified live.
5. Test-mode round-trip (incl. duplicate event) before any real payment.
6. Vocabulary correctness as hard QA failure.
7. Phase 5 selector/integration verifier before any live routing.
8. Source-freshness recorded before `replacement_candidate`.

A state is "launchable" only when: counsel artifact recorded + output verified (read/eyeballed) + vocabulary QA passes + (overlay) visual check passed + source-freshness recorded + Phase 5 gate passed + lifecycle `verified_replacement`.

## 10. One-paragraph summary
Platform (dashboard, RLS isolation, intake, hardened invoice billing) is DONE and live. The record-clearing shadow engine + Nebraska slice are DONE; Nebraska awaits human visual field-mapping. Next: Nebraska CC 6:11 mapping and the Pennsylvania pleading renderer may proceed in parallel ONLY under the file-boundary rules above (each agent stays in its state-specific files; neither refactors shared types/registry/renderer interfaces). Three strategies (pleading / overlay / guidance), the 10 airtight pleading states as the fast first wave, the 27 overlay states as the slow visually-verified track, legacy generators serving until replaced per-state. Every state ships only after counsel artifact + human verification + the Phase 5 live-routing gate. Same engine later founds the consumer Expungement.ai product, which gets its own privacy/payment threat model first. Done when it's done.
