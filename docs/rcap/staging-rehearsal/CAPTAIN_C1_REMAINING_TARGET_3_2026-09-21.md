# Captain decision — the remaining C1 target is the revision constant in `protected_final_verification_current`

**Date:** 2026-09-21
**Decides:** the first real required failure of `hosted_full` run 35557233406,
dispatched on Captain SHA `823ada700` (Codex `a6a03fa85` integrated)
**Status:** Captain decision and Codex handoff. Creates no approval, opens no
route, authorizes no production action.

## Target #2 is closed

`stored_row_matches_authoritative_resolver` **passed hosted**, on the
application-created row, with the identity operands strict and the
`artifact_refs_json` review-state projections gone. The run advanced past it.

More is now proven hosted than before. `unverified_unpaid_render_requires_verification`
**passed** — the real saved-but-unreviewed unpaid render returned 403 with
`reason: "current final verification is required"` — and
`current_final_verification_established` **passed**. The final-review lifecycle
works against the real Preview.

## The failure

```
FAIL protected_final_verification_current —
  {"hash":"27129df410f29c…","draftHash":"e5b5768cc2b98…","revision":1,"failure":null}
```

Read the operands. `verificationRead.ok` held, exactly one row was returned,
`failure` is **null**, and `currentVerification` is **non-null** — so
`requireCurrentPacketVerificationRecord`, the product's own validator, accepted
the record as current and verified. Hash and draft hash are both present and
canonical.

One operand failed: `currentVerification.revision === 2`. The real value is **1**.

## Root cause — the constant encodes the test double's arithmetic, not the product's

The authoritative revision is computed **in the RPC**, not by the application.
`20260901120000_dtc_consumer_launch_rails.sql`:

```sql
-- first insert (line 202)
v_next_revision := case when p_next_verification_status = 'unverified' then 0 else 1 end;

-- update (lines 180-187)
if  p_next_draft_hash = v_prior.draft_hash and … unchanged …
then v_next_revision := v_prior.revision;      -- a no-op does not bump
else v_next_revision := v_prior.revision + 1;
end if;
```

So the real two-transition sequence for this fixture is:

| step | status | revision |
|---|---|---|
| save with `verify: false` — first insert | `unverified` | **0** |
| explicit review with `verify: true` — material change | `verified` | **0 + 1 = 1** |

**Revision 1 *is* the two-transition value.** The product starts an unverified
draft at 0, so two transitions land on 1, not 2.

The application does propose a number — `packet-information.ts:426` sets
`revision: priorProtected.revision + 1` — but the RPC ignores it, computes
`v_next_revision` itself, and returns the authoritative row (`… v.revision` in
the RETURN QUERY), which is what `readProtectedPacketVerification` reads. No
product defect; a proposed field the server overrides, and the caller is handed
the real value back. **Not a target. Do not change it.**

The local test reached 2 because its `persistProtectedPacketVerification` double
stores `transition.nextVerification` verbatim, so it kept the client-proposed
number — 0+1=1, then 1+1=2 — and never exercised the server's numbering. The
double asserted `expectedPriorRevision` faithfully and invented the revision
itself. That is precisely why a wrong constant passed locally and failed hosted.

## Two transitions did happen — proven, not assumed

Not inferred from the number. The saved-but-unreviewed render returned **403**
hosted, which can only happen while no current verified record exists; the
record is now **verified** and accepted by the real validator. Two distinct
states, therefore two transitions. The revision constant is the only thing
wrong.

## Candidate-caused

Yes, and narrowly: `aa6163e1d` introduced `currentVerification.revision === 2`.
It was never checked against the RPC, only against a double that computes the
number a different way.

## The repair, and its bounds — CODEX C1

The target is this one constant and the double that concealed it. **Do not
broaden the sweep.**

**Do:**

- change the expectation to **`revision === 1`**, and record why in the gate:
  an unverified first insert is 0 and the verified transition is +1, so 1 is
  the two-transition value for this fixture;
- **fix the test double so it computes the revision the way the RPC does** —
  first insert `unverified → 0` else 1; on update, unchanged draft hash, status,
  verification hash and both snapshots → same revision, otherwise +1. Without
  this the corrected constant cannot be verified locally, and the suite would be
  green by fiction in the opposite direction.

**Do not:**

- relax the assertion to `>= 1`, `!= null`, or drop it. The two-transition proof
  is the point of the case;
- change the RPC, the migration, `packet-information.ts`, or the client-proposed
  `revision` field;
- touch the PA refusal contract, the MS fixture identity, the stored-row
  identity predicate, the 403 case, `unpaid_render_returns_402`, or any
  acceptance identity.

If the double cannot be made to match the RPC without changing product code,
that is a `CAPTAIN HANDOFF`, not a workaround.

## What is still owed hosted

`unpaid_render_returns_402` remains the next unproven required case — the run
has still never reached it. Nothing here suggests it is wrong.

Identities stay as they are: application `884ad51d0ad50c520ec0ba2834eac03194ce88ac`,
worker source `117b469c453a403fbd217f1c441a08c7c68f6b3a`, digest
`sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f`,
Preview `dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe`, Supabase `hyflxnlhpmiqxvvcoiia`.
No rebuild, republish, new Preview, Stripe retarget or production action is
authorized for this repair.
