# Lane E — migration disposition and evidence

Lane E owns the anonymous-screening-to-authenticated-matter boundary: the
atomic claim, participant ownership, the matter and the Briefcase.

## No migration is proposed

This directory is empty of SQL on purpose. Lane E was prepared to propose a
migration and did not need one: every guarantee the boundary depends on is
already enforced by the committed schema.

| Guarantee | Where it is enforced today |
| --- | --- |
| A matter is never anonymous | `consumer_briefcase_items.user_id uuid NOT NULL` in `20260728213131_remote_schema.sql` |
| One pending result yields one matter | `consumer_briefcase_items_source_pending_result_id_key` UNIQUE |
| The claim is one transaction | `public.claim_pending_screening_result`, row lock first |
| No half-claimed state | `consumer_pending_screening_results_claim_shape` and `_matter_implies_claimed` |
| Only the participant reads their matter | four owner-scoped RLS policies on `auth.uid() = user_id` |
| The claim cannot be called from a browser | `EXECUTE` revoked from `anon` and `authenticated` |
| Denials survive as evidence | `participant_claim_events`, append-only by trigger |

Proposing a migration that re-states any of these would add apply-order risk
and change nothing, so the lane's work went into proving the existing
guarantees hold rather than into new DDL.

## What changed instead

The claim boundary had two passing proofs and no evidence that either was
load-bearing. The lane added that evidence and, in doing so, found and closed
three real holes.

1. **The conflict path did not re-check ownership under test.**
   `ON CONFLICT DO NOTHING` means a claimant that loses the insert race
   re-reads the winner's row. No test reached that path, because an
   already-`CLAIMED` pending result is refused earlier. The guard existed and
   was unproven; deleting it broke nothing. Section 18 of the DB proof now
   constructs the state directly and the mutation dies.

2. **The DB proof measured its own fixture.**
   `baselineSchema()` is hand-transcribed from the production migrations, so
   "the canonical matter owner is NOT NULL" was checked against the
   transcription. Production could have dropped `NOT NULL` or an RLS policy
   with the proof still green. Section 17 compares the fixture against
   `20260728213131_remote_schema.sql`.

3. **Ownership denials were declared, not measured.**
   The proof asserted policies existed and never ran a query as a participant.
   Section 15 now runs as the real `anon` and `authenticated` roles: anonymous
   access, wrong user and wrong matter are denied for reads, and a takeover
   `UPDATE`, a stranger's edit and an `INSERT` naming another owner all fail.

`scripts/test-shared-claim-boundary-mutations.mjs` holds all of it in place
with nine mutations. It refuses to run unless every verifier it depends on is
green on clean source first — a mutation judged by an already-red verifier is
reported as caught no matter what it does, which is how the first version of
this harness scored a worthless mutation as a pass.

## Blocker for the captain

`scripts/verify-screening-verification-finetune.mjs` fails on clean source at
base `be673158bae0f3ffdb8b4c4408f989bcf69720e4`, and did so before this lane
made any change.

Its Mississippi fixture route,
`MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`,
has no record in `data/rcap-ledger/packet-fulfillment-records.json` — which
today carries one record, for a North Dakota route — so
`assertCheckoutAllowed` refuses checkout with `missing fulfillment record`.

The ledger is a captain-only path and packet fulfillment authority is outside
this lane's envelope, so Lane E did not edit either. It is raised here rather
than worked around: suppressing the assertion would have hidden a real
statement about what routes can be sold.
