# Acceptance synthetic queue lifecycle — local repair, no execution authority

Base: `18d26b2fd2280d34b105bb69da2f0e26cb05613e`.
Branch: `codex/acceptance-synthetic-queue-lifecycle`.
No remote write, worker execution, deployment, publication, Stripe operation or
Acceptance reconciliation was performed. The saved inventory was obtained with
`BEGIN READ ONLY` through the Supabase connector; the shell Management API token
returned HTTP 401. No secret was printed or substituted.

## Failure and producer

Run **36186574507** remains **SETUP / QUEUE PRECONDITION FAILURE**. Its target
was enqueued, but `historical predecessor blocks this proof` precedes
`runOneCycle()` in `runClinicTargetCycle()`. Zero attempts and no claim/output,
provenance, delivery, generation or credit corroborate the supplied failure
record. This is not evidence that the Mississippi product journey or current
worker failed. Preserve artifact **10887080289**, ZIP SHA256
`49f2d0d0a6a87369899cf24b8a406521d79428bc5ef34b1da3cc9af257aacfc7`;
these artifact identities are owner-supplied, not a new artifact-download claim.

The August packet rows exist. Their historical `packet not found` errors came
from the missing `ENABLE_SUPABASE_PARTNER_DATA=true` flag already explained and
regression-protected in the accepted harness. Both payment and Clinic currently
pin it true. Retrying remained possible because the old teardown deleted the
consumer item/payment consumption but left immutable jobs failed/retryable.

The payment producer now **retains the fixture namespace**. Jobs cannot be
deleted (`guard_packet_render_job_delete` always raises), consumption is financial
evidence, and deleting an owner cascades its provenance. Therefore there is no
safe teardown order that restores the pre-purchase database by deletion. The
readback names the exact item, shared synthetic auth user, all bound jobs and
payment-consumption IDs; checks owner and non-sponsored binding; and reports
unfinished jobs. It writes nothing. Exceptions and early exits also leave owners
in place because neither delete remains. The shared auth accounts are not owned
by an individual run and are never deleted. This is idempotent retention, not an
assertion that Acceptance was returned to its prior state.

**Limit:** unfinished future jobs remain owned and may still block a later Clinic.
Retention fixes orphan production; it does not authorize automatic backlog
retirement. The Clinic must continue refusing until separately authorized exact
fixture reconciliation is complete. Payment target-following/backlog behavior,
replay, pricing, provider events and accounting code are unchanged.

## Read-only inventory and classifications

`ACCEPTANCE_QUEUE_36186574507_INVENTORY.json` contains the measured identities,
statuses, attempts/timing, packet/owner binding, dependency counts, FK catalog,
lifecycle function fingerprints, claim order, and separate Clinic namespace.
All 20 orphan rows match the known payment synthetic account and packet owner/item
binding. No orphan classification alone grants deletion or mutation authority.

| Class | Count | Proposed treatment |
|---|---:|---|
| Delivered/history-bearing synthetic orphan | 14 | Retain every job and delivery/accounting record |
| Terminal synthetic failure orphan | 4 | Retain unchanged |
| Exact known August retryable orphan | 2 | Retain; owner-authorized terminal disposition with immutable audit receipt |
| Current failed-run Clinic target (not an orphan) | 1 | Separate owner-authorized scheduling hold; retain entire namespace |

The 14 delivered jobs retain 42 delivery events and 14 credit-ledger rows in the
measurement. Their missing consumption/provenance is not permission to erase or
reconstruct evidence. The four terminal failures are `9fdc60c0-d1bc-40fa-81a8-7ee2eb90eaee`,
`ca12bf6b-6ace-4e02-af5c-70e1bfb7d331`, `cab14012-a0ad-44d1-80d2-d0d4bebc87d8`,
and `36a86224-e7aa-4949-8f92-0a5c0e10c892`. All individual delivered IDs remain
in the accompanying inventory and the control's classification output.

## Proposed operations — NOT EXECUTED

Only after both `--apply` and the exact `--owner-authorization` value are supplied,
against project **hyflxnlhpmiqxvvcoiia**:

1. **14c626c2-d287-4d5f-8fef-172fec8e52b9**: keep failed status, attempts 3/5,
   original error, packet `eb6e033d-771d-44ba-8055-89243570ad9e`, matter
   `e214c6fc-3ad8-4e63-a747-50cadf497046`, former item
   `0dcbb137-fd86-4596-82ff-3f9744d44c6c`; change only disposition to terminal
   and next-attempt time to null (normal update timestamp also advances).
2. **e5357bcb-0fb0-45ab-a68e-8ca4eadc6b7d**: same operation, attempts 2/5,
   packet `fb3fb0df-6fef-4abe-a1f1-6462543c06a4`, matter
   `56d8927d-09e1-4a1e-8cbd-121023ee6b01`, former item
   `6f163c13-6255-4673-8299-7fd9541da761`.
3. **dd68fa69-c28b-4867-ac44-d538d83c1162**: keep queued status and attempts
   0/5; set `next_attempt_at = 'infinity'` as an explicit administrative hold.
   This is neither successful completion nor participant cancellation. Retain
   packet `42f7e1e1-c0c1-44f3-871b-2434705986b8`, render matter
   `db1e9b15-3200-472d-a9f4-f290ad20e4b8`, item
   `8e606570-5d90-4c7b-b554-152be4d14a67`, participant
   `e7c1d76e-dcf2-4d41-b585-ba164806f391`, session
   `a0b919e5-1977-4416-8ab5-f6ed4f239d9c`, event
   `77000000-0000-4000-8000-000000000055`, case
   `2de4e2c5-44c6-49b5-91bc-cd24f966bc21`, and pending claim
   `fad24975-e205-4404-9bdf-a6b0d42987dc`. No reservation exists. Sponsor
   `mvl-demo` usage and overage counters remain zero; no slot/credit is refunded
   or consumed. A rerun must create a new namespace, never reuse this held item.
4. Append exactly three immutable `rcap_record_events` document-packet receipts
   containing the before-state, exact job ID, operation and owner authorization.
   No existing event, job, packet, owner, provenance or accounting row is deleted.

Sanctioned `fail_packet_render_job` requires an in-flight lease/fencing token;
it cannot fail a never-claimed queued job or an already failed row. The participant
cancellation function is not installed in this Acceptance schema and would assert
an erasure request that did not occur. Global housekeeping is not exact-ID scoped.
The narrow admin control therefore uses same-status updates permitted by current
guards, without spoofing worker/housekeeping authority, disabling triggers,
changing grants or installing a runtime function. The queued infinite hold stays
outside both live claim and historical-housekeeping predicates. The historical
rows become terminal, not failed/retryable with an infinite time (which would
still cause a housekeeper write and violate Clinic isolation).

The transaction briefly locks the measured dependency relations to prevent
concurrent queue/evidence changes, re-reads the complete snapshot and refuses any
drift before the first write. Lock/statement timeouts are bounded. Unknown FK
relations, changed live lifecycle functions, a differing claimable orphan set,
new evidence, foreign ownership or unrelated claim/housekeeping work refuse.
Repeated execution requires all three receipts and exact resulting states and
performs no writes. It does not accept a missing pair as proof of prior success.

Predicted claim order now: August job 1 → August job 2 → old Clinic target.
After those exact authorized operations: **empty**, with **zero pending historical
housekeeping**. A new target could then be first; it must still pass the unchanged
live Clinic assertions at execution time. This prediction is not a rerun pass.

Read-only command:

```sh
node scripts/rcap-acceptance-queue-reconciliation.mjs --project hyflxnlhpmiqxvvcoiia
```

The separate, NOT authorized here, apply command is:

```sh
node scripts/rcap-acceptance-queue-reconciliation.mjs \
  --project hyflxnlhpmiqxvvcoiia --apply \
  --owner-authorization 'Roger:acceptance-queue:36186574507:retire-two-august-retries-and-hold-unstarted-clinic'
```

## FK/schema analysis

**B — an immediate owner FK is inappropriate; fixture retention is the correct
repair for this producer. No migration.** Phase 51 deliberately supports absent
consumer storage using dynamic payment lookup; Phase 53 enqueues with validated
consumer ownership or separate partner bindings. Partner/sponsored jobs use null
consumer bindings. Current consumer enqueue requires an already persisted owner;
it does not legitimately create a consumer-bound job before its owner. More decisively, the participant privacy lifecycle legitimately
deletes consumer items while retaining accounting/render evidence and later
pseudonymizing identifiers (`src/lib/expungement-ai/privacy/deletion.ts`,
`supabase/migrations/20260830120000_participant_data_rights.sql`).

A RESTRICT FK would block that workflow; CASCADE contradicts the job no-delete
rule and ledger/delivery retention; SET NULL conflicts with immutable consumer
bindings and loses the retained association. A simple FK is not needed to prevent
this harness from deleting owners once teardown retains them.

This does not certify every privacy-deletion race: its cancellation RPC only
covers queued jobs, and retryable/in-flight erasure behavior deserves a separate
bounded review before claiming a universal no-claimable-orphan runtime property.
No application, auth/RLS or schema change is authorized by this finding.

## Verification and release boundary

The original target-worker source control fails twice on the exact untouched
Captain baseline: its regex predates the attempt-budget predicate and deterministic
`created_at,id` ordering, and still demands a 200-row truncation. Reproduced from
Git blobs under `/tmp/queue-target-control-baseline`. The control now requires the
current four conditions, complete ordering and added mutations. The live claim
projection and payment/Clinic worker-cycle algorithms are unchanged.

The clean-release unit fixture also failed on untouched Captain: it omitted
`runtimeAccepted` and the required successful read-only image-acceptance receipt.
Reproduced from exact Git blobs under `/tmp/queue-release-control-baseline`.
The synthetic fixture now supplies the current receipt and explicitly proves
removing that receipt still refuses; no acceptance control was relaxed.

The local tools receipt uses a finite exact-path SHA256 overlay on the previous
immutable tools SHA so the authorized single commit need not self-reference its
own commit SHA. The verifier validates every byte and the exact fixed file set;
no runtime path or broad directory exemption is permitted. Dispatch/push/execution
remain held. It is not an accepted hosted tools execution record.

Preview **dpl_EopdPGhnhjk8JqwdiAqi9RYmATpB** is preserved and must be reused.
Accepted application/worker source remains
`6ebacdcde8afdf8aa706f16b38e0646babcbdc49`; digest remains
`sha256:74b82e11aac7fa1f850ca52ba1344ca7853fa09120374a83ddb5bbc019f8cdd7`;
39-root fingerprint remains
`sha256:c202ebba08c34ce3665f69269fb913078b02188519c5196af7f3639da84dd0d8`.
A new worker publication is unnecessary. Final local verification and independent
review results are reported with the local commit, not as hosted acceptance.
