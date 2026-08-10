# RCAP packet delivery — apply-order is a security control

Owner: Session B (database-role / private-storage adversarial review)
Scope: `supabase/phase-49-rcap-packet-render-jobs.sql`,
`supabase/phase-50-rcap-packet-delivery-hardening.sql`
Held by: `scripts/verify-rcap-runtime-credential-boundary.mjs`

This document records one finding: **phase 49 must never be applied to a shared
environment without phase 50 applied in the same window.** The ordering is not
sequencing hygiene. It is the only thing standing between a browser role and a
partner's sponsored packet allocation.

## The finding

Phase 49 creates two `SECURITY DEFINER` functions and issues **no `REVOKE`**:

- `public.consume_rcap_packet_credit(text, text, uuid)`
- `public.claim_packet_render_job(text, text[])`

PostgreSQL grants `EXECUTE` to `PUBLIC` by default. On Supabase, `anon` and
`authenticated` inherit that grant and both roles are reachable from the public
internet through PostgREST (`POST /rest/v1/rpc/<function>`) using the publishable
anon key. Because the functions are `SECURITY DEFINER`, they execute as the
owner, so the table privileges and RLS that would otherwise stop a browser role
never come into play.

Reproduced against a real PostgreSQL 16 cluster with phase 49 applied alone:

| Attack as a browser role | Result |
|---|---|
| `authenticated` → `consume_rcap_packet_credit(...)` | **succeeded** — `{"ok":true,"reason":"consumed"}`, a row written to `rcap_packet_credit_consumptions` |
| `anon` → repeat for further matters | **succeeded** — allocation of 5 fully burned, then into `overage` |
| `anon` → `claim_packet_render_job('attacker-worker', ...)` | **succeeded** — a queued job claimed by an attacker-named worker |
| `authenticated` → direct `INSERT` on the consumption table | denied (no table grant) |

The direct-table denial is what makes this easy to miss: the table privileges
look correct. The `SECURITY DEFINER` function is the bypass.

## Why this state is reachable

It is not hypothetical. In `data/rcap-authorization-queue.json`:

- phase 49 — `status: authorized`, `applyStaging: authorized`,
  `applyProduction: authorized conditionally`
- phase 50 — `status: authorized_scoped`, `repository_integration_only`,
  and its `doesNotAuthorize` explicitly excludes "application to staging or
  production"

So the only database state currently authorized for production **is phase 49
alone** — the vulnerable one. Phase 50 lists "phase-49 applied immediately
before, in the same authorized window" as its own precondition, but phase 49's
authorization carries no reciprocal requirement.

## The containment

Phase 50 closes it completely. It drops `consume_rcap_packet_credit` and the
2-argument `claim_packet_render_job`, and revokes `EXECUTE` from `public`,
`anon` and `authenticated` on every replacement function. Verified on a real
cluster: after 49+50, no packet mutation function is executable by either
browser role, and the only functions still carrying a `PUBLIC` execute grant are
trigger functions (which raise `trigger functions can only be called as
triggers`) and two read-only helpers that cannot be reached without a table
privilege the browser roles do not hold.

## Required action before any shared-environment apply

1. Apply phase 49 and phase 50 in the **same** authorized window, phase 50
   immediately after phase 49. Do not close the window in between.
2. If phase 49 must stand alone for any period, revoke first, in the same
   transaction as the apply:

   ```sql
   revoke all on function public.consume_rcap_packet_credit(text, text, uuid)
     from public, anon, authenticated;
   revoke all on function public.claim_packet_render_job(text, text[])
     from public, anon, authenticated;
   ```

3. Recommended queue amendment (Roger's call — this document does not make it):
   add "phase-50 applied in the same window, or the two phase-49 functions
   revoked from `public`, `anon` and `authenticated`" to the phase-49 entry's
   `preconditions`. The phase-49 file itself is hash-pinned and must not be
   edited; that would void its authorization.

## Two residual trust gaps in the 49+50 state

Neither is remotely exploitable by a browser role. Both are recorded because the
only control for each lives outside the database, and
`verify-rcap-runtime-credential-boundary.mjs` pins that control so it cannot be
removed silently.

**1. Accounting identity is not checked for coherence.**
`enqueue_packet_render_job` accepts `p_partner_id`, `p_person_id` and
`p_matter_id` as independent caller-supplied values. Nothing in the database or
in `src/lib/rcap/render/job-queue.ts` verifies that the person belongs to the
partner. Proven: a job enqueued with partner A's id and partner B's person id
finalizes to `accounting_result = consumed` and writes a `packet_credit_ledger`
row charging **partner A for partner B's participant**. The ledger is
append-only and refuses `UPDATE`/`DELETE` at trigger level for every role
including the owner, so a mischarge is permanent and unreversible. The
compensating control is that only `service_role` may call enqueue.
`public.rcap_persons.partner_slug` already carries the linkage a database-level
check would use.

**2. Delivery events carry no ownership or actor verification.**
`record_packet_delivery_event` checks only that the job is delivery-eligible. A
holder of the `rcap_packet_delivery` credential can record any event type
against **any** eligible job, supply an arbitrary `actor_user_id`, and flip the
job to `delivered` via `transmission_completed`. It cannot read the job row or
the artifact bytes, so this is evidence corruption, not exfiltration. The only
ownership check is `userOwnsBriefcaseItem` in
`src/lib/rcap/render/packet-delivery.ts`.
