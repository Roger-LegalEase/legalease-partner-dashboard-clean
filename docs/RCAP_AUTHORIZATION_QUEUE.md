# RCAP Authorization Queue

Production-touching actions wait here until Roger authorizes them in one of his
two daily windows. Agents execute after authorization; Roger never runs a
migration or a deploy by hand. Nothing on this list has been applied.

Machine work never waits on this queue — only the actions listed here do.

## Queued

> The machine-readable queue is `data/rcap-authorization-queue.json`; entries
> there carry exact paths and pinned SHA-256 hashes enforced by
> `scripts/source-engine-change-scope.mjs`. This document is the narrative
> companion.

### A1 — Apply the canonical migration sequence to STAGING (prepared, awaiting grant)

The unified sequence is `phase-49-rcap-packet-render-jobs.sql` (PR #91,
authorized) followed immediately by
`phase-50-rcap-packet-delivery-hardening.sql`. The machine queue holds the
hash-pinned entries and the prepared `A1-staging` action; granting it requires
Roger to name both files and the staging environment. The rehearsal that
follows is `docs/RCAP_STAGING_REHEARSAL_PLAN.md`. Nothing is applied anywhere
until then.

### A1-old — the superseded phase-48 request (kept for history)

| | |
|---|---|
| **Action** | Run the migration against Supabase |
| **File** | `supabase/phase-48-rcap-packet-render-jobs.sql` |
| **Status** | Queued 2026-08-10, not applied |
| **Touches** | New table `packet_render_jobs`, four new functions, two triggers |
| **Does not touch** | Any existing table, RLS policy, auth or session logic |
| **Reversible** | Yes — `drop table public.packet_render_jobs cascade` plus the four functions. No existing data is read or written by this migration. |
| **Blocks** | Durable render jobs, credit-after-validation, the worker, Milestone 1 gate items 1 and 3 |
| **Evidence to capture on apply** | Object presence for the table, the four functions and both triggers, since the Supabase migration ledger holds a single baseline row and applied phases can only be proven by object presence |

Order of application: apply to the staging stack first and run
`verify-rcap-packet-render-jobs.mjs` against it before production.

### A2 — RESOLVED: packet accounting EXTENDS, does not replace

Resolved by the delivery-gate directive: `partner_entitlement` and every
screening flow stay untouched; packet capacity lives in the new
`partner_packet_entitlement` (keyed on immutable `partner_records.id`) with the
append-only `packet_credit_ledger`. `configurePacketCap` and the onboarding
view now read and write the packet entitlement — the old code stored the packet
cap into `screenings_allowed`, silently overwriting screening capacity.

### A2-old — original question (kept for history)

| | |
|---|---|
| **Action** | Confirm that packet accounting replaces, rather than extends, the screening-shaped `partner_entitlement` |
| **Why it needs Roger** | `partner_entitlement` has seven screening columns and no packet columns. `pause_at_cap` and `overage_enabled` are absent, so cap logic fails open, while `partner-onboarding.ts:504` already audits all three as if they existed. Whether the fix adds columns or a separate table changes what the migration touches. |
| **Not being asked** | The We Must Vote allocation itself. That is resolved and final: 100 sponsored packet sets, one unit per distinct supported matter on first `artifact_validated`, thresholds at 75 / 90 / 100, packets 101–110 an internal non-billable continuity reserve. It is encoded as given. |
| **Status** | Queued 2026-08-10 |

## Not queued, and why

- **Neither milestone flip.** Milestone 1 gate item 1 is not met: there is a
  validated render but no validated delivery.
- **Any deploy.** No production-touching change is ready to ship.
- **Test-data cleanup in the We Must Vote dashboard.** Real and needed — Roger's
  personal account sits in the partner's dashboard — but it requires production
  data access this build environment does not and must not have. It belongs to
  external register item 9.
