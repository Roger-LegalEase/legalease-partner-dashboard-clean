# ADR-0001 — Participant ownership and the claim boundary

**Status:** Accepted as architecture. Implementation blocked.
**Date:** 2026-08-28
**Authority:** `docs/PRODUCT_CONTRACT.md`
**Supersedes:** the approach taken in migrations `20260828000000` and `20260828001000`, both of which are now `NOT_APPLIED / TRANSITIONAL / NOT_ACCEPTED`.

## Decision

> Screening may be anonymous. A Briefcase may not be anonymous. A pending result
> becomes a matter only when it is securely and atomically claimed by the
> authenticated participant.

> A partner owns its program workspace. A participant owns their account, matter,
> Briefcase, packet, uploads, and participant-specific workflow.

## Context — what traceability found

Mapping every table, route, writer and policy against the eleven contract objects
produced one finding that subordinates the rest: **the product has two parallel,
non-converging implementations of matter and Briefcase.**

| Object | DTC | RCAP | Classification |
|---|---|---|---|
| anonymous_screening_session | `screening_sessions` | `rcap_intake_sessions` | CONFLICTING |
| pending_result | `consumer_pending_screening_results` | **none** | MISSING (RCAP) |
| authenticated_account | `auth.users` + `rcap_user_profiles` | same | CONTRACT_ALIGNED |
| matter | `consumer_briefcase_items` | `rcap_briefcase_items` | DUPLICATED_AUTHORITY |
| briefcase | conflated with the item table | conflated with the item table | PARTIAL |
| verification_snapshot | **none in mainline** | none | MISSING |
| entitlement | **none in mainline** | `partner_entitlement` (partner-level) | PARTIAL |
| render_job | **none in mainline** | none | MISSING |
| artifact | **none in mainline** | none | MISSING |
| assisted_session | n/a | `clinic_assisted_sessions` | CONTRACT_ALIGNED |
| consent_grant | n/a | inside clinic tables, not a first-class object | PARTIAL |

The DTC path has a pending result, an owner-scoped item table, and a claim route.
The RCAP path has **no pending-result object at all**: intake writes directly to
durable partner-owned tables. That is not a policy defect to be patched. It is
the absence of the claim boundary itself.

`verification_snapshot`, `render_job` and `artifact` exist nowhere in the
mainline. They exist only as sixteen functions on the unmerged
`wip/20260827-national-cas-paused`.

## Why the two PIN-05 migrations are not accepted

**`20260828000000` does not work.** `GRANT ALL ON TABLE ... TO authenticated`
(and to `anon`) is issued on all three tables. In PostgreSQL a table-level
`SELECT` grant permits every column, so a column-level `REVOKE` layered on top
changes nothing. The migration reads as a fix and is inert.

**`20260828001000` treats the symptom.** Adding `user_id` to
`rcap_intake_sessions` gives an owner to an object that, under this ADR, should
not be durable before a claim. Backfilling it by sequential `UPDATE` also picks
silently between conflicting owners where a session links to records owned by
different users.

Both are retained as diagnostics. Neither is applied.

## Decision detail

1. **RCAP gains the claim boundary rather than better policies on partner-owned
   tables.** `rcap_intake_sessions` becomes an explicitly temporary pre-claim
   object with a lifecycle — `ANONYMOUS_IN_PROGRESS`, `PENDING_CLAIM`, `CLAIMED`,
   `EXPIRED`, `REVOKED` — and is never a matter or a Briefcase item.

2. **One claim service serves both products.** The DTC claim path and its
   pending-result table are the reusable asset; RCAP joins them rather than
   growing a second one. Attribution — partner, program, event, campaign, locale,
   consent — is carried through the claim, which is what makes sponsorship work
   without partner ownership.

3. **Durable participant objects require an owned matter.** Packets, Briefcase
   items, render jobs, artifacts and entitlements are created only after a claim.
   `userId ?? null` stops being an accepted value for them. Constraints are
   per-object, not one global trigger on intake.

4. **Partners read a fixed-schema reporting interface, never raw participant
   tables.** Partner membership authorizes aggregate and operational data. The
   partner is derived from authenticated server context, never from a
   browser-supplied slug.

5. **Least privilege is set at the grant layer first.** Table, column and default
   privileges are corrected per role — anonymous, participant, partner staff,
   partner administrator, internal administrator, service operations — before any
   policy is written. A column `REVOKE` beneath a table `GRANT` is not a control.

6. **Service-role paths prove authorization in the application.** 33 modules in
   participant-data areas use `getSupabaseAdminClient`, which bypasses RLS
   entirely. Each must demonstrate owner, matter, partner, event, consent and
   purpose checks. No endpoint returns participant data on a client-supplied id
   alone.

7. **Reconciliation replaces backfill.** Every row is classified —
   `OWNER_PROVEN_UNIQUE`, `OWNER_CONFLICT`, `OWNER_MISSING`, `OWNER_AMBIGUOUS`,
   `TEMPORARY_UNCLAIMED_VALID`, `CROSS_PARTNER_CONFLICT` — and only
   `OWNER_PROVEN_UNIQUE` is written. Counts and redacted identifiers go to a
   restricted remediation register, never into Git.

8. **Database proof is required before acceptance.** Effective access is measured
   against isolated PostgreSQL as each role, using `has_table_privilege`,
   `has_column_privilege`, `role_table_grants`, `column_privileges`, `pg_policies`
   and real DML — not by reading the migration.

## Consequences

The work is larger than a migration. It is the claim boundary RCAP never had,
and it converges two divergent object models. It also unblocks more than PIN-05:
the same boundary is what `IAM-12` (claim credential), `PIN-02` (atomic claim)
and the 24 unmerged CAS findings all depend on.

Legacy generators are preserved throughout. `rcap_document_packets.state`
defaults to `'MS'`; nothing here removes a partner or internal-admin read path
that exists today until a replacement interface is proven.

## Naming

Never "free record check" or "record search" unless an authoritative record
source is actually queried. The system asks questions; it searches no record.

Two approved terms already exist in the repository and both satisfy that rule,
so this ADR fixes which is used where rather than introducing a third:

- **Participant-facing UI and the product-flow docs that quote it: "free guided
  check."** This is the term already carried by `landing-approved-copy.ts` and
  `src/lib/expungement-ai/localization.ts` in both `en` and `es`.
- **Contract, architecture, control and screening-design documents: "free
  screening."** This is the term already carried by `PRODUCT_CONTRACT.md` and
  `docs/screening/FREE_CHECK_ALL_51_JURISDICTIONS.md`.

Fourteen surviving "record check" strings were corrected to the UI term,
including the `humanMatterState` union member `"Record check saved"` and both of
its comparison sites. `${state} record check` in `briefcase.ts` and the
`briefcase.new_check` label were corrected with them. The `"Start free record
check"` entry in the We Must Vote CTA accept-list was dead — the static landing
already reads "Start free screening" — and was removed.

The RCAP engine profiles keep "record check" wherever it names a real
authoritative search: the Oregon State Police LEDS check, the North Carolina
AOC and SBI checks. Those are record checks.
