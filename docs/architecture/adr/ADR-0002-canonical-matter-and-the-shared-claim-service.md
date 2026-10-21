# ADR-0002 — The canonical matter, and one claim service for both products

**Status:** Accepted.
**Date:** 2026-08-28
**Authority:** `docs/PRODUCT_CONTRACT.md` §6, §7, §15, §17
**Builds on:** `ADR-0001-participant-ownership-and-the-claim-boundary.md`
**Base:** `f674546c` (containment), from `81da18dd`

## Context

ADR-0001 established that RCAP has no pending-result object at all, so the claim
boundary is absent rather than mis-policied, and that the fix is to give RCAP the
boundary the DTC path already has rather than better policies on partner-owned
tables.

Contract §6 requires a repository-based decision, recorded before implementation,
on whether to evolve an existing owner-scoped durable object into the canonical
matter (A) or to add a `matters` table and demote the current item tables to
projections (B). It also says: do not create a new table automatically.

## Decision 1 — Option A. `consumer_briefcase_items` is the canonical matter.

It already satisfies most of the required design, and three other subsystems
already treat it as the matter:

| Contract requirement | Already true today |
|---|---|
| `owner_user_id NOT NULL` | `user_id uuid NOT NULL`, FK `auth.users(id) ON DELETE CASCADE` |
| One participant owner | Four owner-scoped RLS policies on `auth.uid() = user_id` |
| Guidance, automatic, not-yet, referral and packet outcomes | The `result_code` check already admits `guidance_only`, `not_yet`, `not_covered_yet`, `likely_not_eligible`, `needs_review`, `hard_stop` alongside the two packet codes |
| No requirement that a packet exists | `packet_status` defaults to `not_started`; `packet_type` is nullable |
| `source_pending_result_id UNIQUE` | **The one thing missing.** Added by this work. |

And the references that already point at it:

- `clinic_cases.matter_id uuid references public.consumer_briefcase_items(id)`
- `packet_render_jobs.matter_id`
- the consumer payment columns, which bind Checkout to this row

Option B would fork every one of those foreign keys and create precisely the
duplicated route, payment and verification authority the contract forbids. It is
rejected on those grounds, not on effort.

**What this does not decide.** The table is still *named* for a Briefcase item.
The rename is mechanical, wide, and buys nothing this workstream needs, so it is
deferred. Read the object as: `consumer_briefcase_items` **is** the matter, and
the Briefcase is the presentation over the participant's set of matters. The
Briefcase is not a row anywhere, and under this ADR it should not become one.

## Decision 2 — one pending-result object, extended rather than duplicated.

`consumer_pending_screening_results` already exists, is already RLS-isolated to
`service_role`, and already carries the answer snapshot, the profile version and
the expiry. It becomes the single governed pre-claim object for both products.
RCAP joins it; it does not grow a second one.

Contract §7's record maps onto it as follows.

| §7 field | Column | Change |
|---|---|---|
| `pending_result_id` | `pending_id` | — |
| `anonymous_session_id` | `anonymous_session_id` | renamed from `source_session_id` |
| product / channel | `product` | — |
| `jurisdiction` | `jurisdiction` | — |
| `answer_snapshot` | `screening_answers` | — |
| preliminary outcome class | `result_code` | — |
| candidate route context | `candidate_route_context` | new; `result_payload` and `packet_plan` retained |
| profile / legal-rule version | `profile_version` | — |
| `locale` | `locale` | new |
| partner attribution | `partner_slug` | new |
| program attribution | `program_id` | new |
| event attribution | `event_id` | new |
| campaign attribution | `campaign_name` | new |
| consent reference | `consent_grant_id` | new |
| `claim_token_hash` | `claim_token_hash` | renamed from `pending_token_hash`; now load-bearing |
| `created_at` / `expires_at` / `claimed_at` / `claimed_user_id` | — | — |
| `claimed_matter_id` | `claimed_matter_id` | new |
| `status` | `status` | new: `PENDING` · `CLAIMED` · `EXPIRED` · `REVOKED` |

Two renames are deliberate corrections rather than tidying.

**`matter_id` → `screening_correlation_id`.** Contract §2: a screening
correlation ID may exist, but it must not be called `matter_id`. The old column
held a browser-supplied string used to correlate an evaluation. It never was a
matter, and its name invited exactly the mistake the contract forbids.

**`source_session_id` → `anonymous_session_id`.** Same column, correct name. It
points at `screening_sessions`, which is the anonymous session.

## Decision 3 — the claim token becomes the authorization, and `pending_id` stops being one.

Today possession of `pending_id` is the entire authorization for a claim.
`pending_token_hash` exists in the schema and is never written or read — the
column comment says so outright: *"server claims currently use pending_id only."*
That is the defect, not an oversight to preserve.

After this change the browser submits an opaque single-use token; the server
compares its SHA-256 against `claim_token_hash` under a row lock. `pending_id`
alone authorizes nothing.

**This invalidates pending results created before the migration.** They carry no
token hash, so under the new rule they can never be claimed. The migration marks
them `REVOKED` rather than fabricating tokens for them. The window is bounded by
the 24-hour claim window the contract recommends and which the table already
enforces; the alternative is keeping the ID-only path alive, which is the whole
defect.

## Decision 4 — one atomic RPC, and denials that survive their own rollback.

The claim is `public.claim_pending_screening_result(...)`, `SECURITY DEFINER`,
executable by `service_role` only. It runs contract §7's ten steps in the
caller's transaction, taking `FOR UPDATE` on the pending row first.

The current route does the opposite of this and says so in its own comments: it
writes the Briefcase item first, then tries to mark the pending result claimed,
and when that second write fails it logs and **returns success anyway**. Contract
§4 names that case directly — a claim-state failure may not return success.

One design point is worth recording because it looks like a shortcut and is not.
**Denials return an outcome; they do not raise.** A PostgreSQL exception rolls
back the whole transaction, which would roll back the audit row written to record
the denial. Since §15 requires claims to produce audit evidence, a denied
different-user claim has to leave a durable trace, so the function returns
`(matter_id, outcome)` and the route maps every `denied_*` outcome to one generic
response. Only genuine internal faults raise.

The two-tab and two-callback races are closed twice over: the `FOR UPDATE` lock
serializes claimants, and `source_pending_result_id UNIQUE` with
`ON CONFLICT DO NOTHING` means the loser of any race that slipped the lock reads
the winner's matter instead of creating a second one — returning it as an
idempotent replay for the same user, and as a generic denial for a different one.

## Decision 5 — attribution travels through the claim; it never becomes ownership.

Partner, program, event, campaign, access code, consent grant and locale are
captured on the pending result and copied onto the matter at claim time. That is
what makes sponsorship work without partner ownership: the partner's claim on the
matter is an attribution record, and the participant's is `user_id`.

## Consequences

`consumer_briefcase_items.source_pending_result_id` deliberately carries no
foreign key to the pending table. Pending rows are short-lived and are deleted or
de-identified by retention; the matter must outlive them. `claimed_matter_id`
does carry a foreign key, in the direction that survives.

RCAP intake keeps writing `rcap_intake_sessions` as it does today. Nothing here
changes the preserved legacy generators, and nothing here removes a partner or
internal-admin read path. The RCAP-side pre-claim lifecycle from ADR-0001 §1
lands with the durable-object boundary in the next phase, once matters have an
owner to be required.

PIN-05 stays `BLOCKED`. This ADR is the architecture it was waiting on, not its
closure: the grant-layer redesign, the service-role authorization audit and the
conflict-aware reconciliation are still outstanding.
