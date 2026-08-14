# RCAP Delivery Lane Reconciliation — 2026-08-10

Two lanes independently built durable packet render jobs. This document is the
canonical disposition of every overlapping path and DDL object, produced by the
sole integration captain on `claude/rcap-delivery-unification`.

## Branch and ref verification

| Ref | Verified location |
|---|---|
| `2dced50e` | main tip, locally and on origin |
| `78539358` | tip of `origin/claude/rcap-packet-delivery-gate` (delivery lane) |
| `de89694` | on `origin/claude/rcap-nationwide-build-pkbkeh` (earlier captain branch) |
| `53ab0248` | on `origin/claude/codespaces-zip-retrieval-jr89us` (authority lane, tip now `fdfd7322`) |
| `3b6f4c1` | on `origin/feat/record-clearing-production-integration` and an rcap-factory branch — the recorded integration branch exists after fetch |
| `aa52c6b1` | tip of `origin/claude/rcap-phase-49-migration` = PR #91, open, base main |

## Canonical migration disposition

**Phase 49 is the base. The delivery lane's phase-48 file is superseded and its
hardening became phase 50.**

Grounds, in order of weight:

1. **Authorization ownership.** Phase 49 carries an owner authorization
   (`authorizedBy: Roger Roman`, decision `approved`, hash-pinned, scope
   including conditional production application) and an open PR (#91).
   Superseding it would discard an owner grant; a captain cannot do that.
2. **Numbering.** Phase 48 already belongs to the held document-artifact
   migration (PR #89, explicitly `[HELD — DO NOT MERGE]`); phase 49's header
   sequences after it. The delivery lane's use of "phase 48" was a collision.
3. **Convention.** The authority lane's queue enforcement, fixture, and
   verifier all reference phase 49 by name.

One deliberate supersession inside phase 50, stated loudly: phase 49's
`rcap_partner_packet_allocation` and `rcap_packet_credit_consumptions` key
accounting on `partner_slug` (mutable), with text matters, no person and no
program dimension. The unification requirement — immutable `partner_id`,
`entitlement_id`, `person_id`, `matter_id` — cannot be met by extending a
slug-keyed primary key, so phase 50 drops the two provably-empty tables and
`consume_rcap_packet_credit`, and creates `partner_packet_entitlement` and the
append-only `packet_credit_ledger`. The phase-49 **file** is untouched, its PR
and authorization stand, and its own verifier passes unchanged on the unified
branch.

**PR #91 disposition: unaltered.** It merges as-is; the unification branch
carries its five files byte-identical, so the merge is a no-op collision-free
union. Retiring or editing it was neither needed nor authorized.

## DDL-object reconciliation (final state after 49 → 50)

| Object | Phase 49 | Phase 50 | Final |
|---|---|---|---|
| `packet_render_jobs` | creates (uuid packet FK, source NOT NULL, per-state timestamps, no fencing) | ALTERs: +renderer_version, +identity (partner/person/matter/briefcase), +fencing_token, +lease, +max_attempts/backoff, +failure_disposition, +last_error_detail, +delivery_eligibility, +accounting_result, +container_digest, +output_byte_count; relaxes source NOT NULL with compensating per-renderer-kind constraint; stricter validated-requires-output | one table, hardened |
| state machine | CASE-form trigger `packet_render_jobs_guard_transition` | replaced by clause-form `guard_packet_render_job_transition` (same fixture transitions + authority routing + accounting/evidence/identity protection + timestamp stamping carried over) | one machine, fixture-pinned twice, verified three ways |
| claim | `claim_packet_render_job(text, text[])` — no lease, no token | dropped; `claim_packet_render_job(text, text[], integer)` with fencing token and lease | one claim, fenced |
| accounting | `rcap_partner_packet_allocation` + `rcap_packet_credit_consumptions` + `consume_rcap_packet_credit` (slug-keyed) | dropped while empty; `partner_packet_entitlement` (immutable partner id, program scope, periods, overage reserve, pause_at_cap) + `packet_credit_ledger` (append-only, unit = partner:entitlement:person:matter) + atomic `finalize_packet_render_job` | one accounting model, immutable IDs |
| delivery evidence | — | `packet_delivery_events` (`delivery_authorized`, `transmission_started/completed/aborted/failed`) + `record_packet_delivery_event` | one evidence trail |
| RLS/grants | service_role FOR ALL policies | policies dropped; runtime roles lose direct DML; SELECT + EXECUTE only; dedicated `rcap_render_worker` / `rcap_packet_delivery` roles with disjoint function sets | grants are the boundary |
| storage bucket | — | `rcap-packet-artifacts-private` | one bucket |
| live-input unique index | creates | inherited unchanged | one idempotency key |

## Shared-path ownership dispositions

| Path | Disposition |
|---|---|
| `supabase/phase-49-rcap-packet-render-jobs.sql`, `supabase/tests/phase-49-...test.sql` | PR #91 lane owns; byte-identical on unification branch |
| `scripts/verify-rcap-packet-render-jobs.mjs` | PR #91 lane owns (its phase-49 PG verifier, byte-identical); the delivery lane's in-proc tests moved to `verify-rcap-packet-delivery-contract.mjs` |
| `data/rcap-render/state-machine.json` | authority lane owns; byte-identical everywhere |
| `scripts/source-engine-change-scope.mjs` + four guard copies | authority lane owns; byte-identical (its `fdfd7322` advance touched only its own audit files plus a content-addressed cache in the guard — adopt on next sync, no conflict with this branch's copy) |
| `data/rcap-authorization-queue.json` | shared mechanism; append-only edits — phase-49 entry untouched, phase-48 entry superseded (grant removed), phase-50 entry added |
| `scripts/verify-rcap-render-job-contract.mjs` | one canonical parity verifier (this branch): fixture ↔ phase-49 SQL ↔ phase-50 SQL ↔ TypeScript |
| `src/lib/rcap/render/*` (contract, queue, worker, storage, delivery) | delivery lane owns; the authority lane's parallel `job-contract.ts`/`worker.ts` (its branch, not PR #91) are superseded by these — flagged for that lane's next rebase |
| `src/lib/partners/partner-onboarding.ts` | delivery lane's configurePacketCap fix stands; no other open PR touches it (PR #90 verified: workflow + UI verifier only) |
| PR #87 (`fix/platform-document-delivery-core`) | no path collision (works under `src/lib/rcap/documents/`); **semantic overlap flagged**: it carries its own delivery-core concepts and an HTTP acceptance verifier — product-level reconciliation belongs to Roger's window, not this task |
| completion ledger / crosswalk (`data/rcap-ledger/*`, denominator docs) | authority lane owns exclusively; untouched |

## Milestone 1 item 2 / denominator status (report only, no work done)

The original captain branch (`claude/rcap-nationwide-build-pkbkeh`) carries
`data/rcap-all50/completion-ledger.json` v1: 324 tracks derived from compiled
profiles against the declared 497, unreconciled, with the gap recorded rather
than hidden. The authority lane owns the reconciliation:
`scripts/reconcile-rcap-denominator.mjs` and
`docs/record-clearing/denominator-reconciliation.md` exist on
`origin/claude/codespaces-zip-retrieval-jr89us` alongside the authority ledger
(`data/rcap-ledger/authority-ledger.json`). To publish the reconciled
denominator, that lane's outputs need: integration of its branch, one
generation run of its authority ledger against the merged tree, and the
captain-branch ledger either regenerated from the same inputs or retired in
favor of the authority ledger. Nothing here changed any of those inputs.
