# Clinic downstream closure — local proof, live execution held

Parent: `51ad71a326112eda76f089ef27284b1bc15cba7f`. That commit was already
pushed by the preceding explicit one-push authorization; readback confirms it is
remote Captain. This correction is a separate local commit, not an amendment.
No additional push, Acceptance write, reconciliation apply, rerun, deployment,
worker build/publication or Production action occurred in this task.

## Root causes and live disposition

51ad fixes the sponsored Preview runtime transport; it does **not** seed packet
capacity. The seed populated `partner_entitlement` (screening/Clinic allowance)
but omitted `partner_packet_entitlement` (packet accounting). Read-only Acceptance
measurement confirms zero packet entitlement rows, current sponsored authority,
current protected verification and a private PDF-only artifact bucket.

The accepted packet finalizer returns `unauthorized/accounting_blocked` without
an effective packet entitlement. It persists `artifact_validated` even for that
blocked accounting result; adding capacity later does not fix that same job.
An executable SQL mutation reproduces both the refusal and sticky replay. The
new pre-worker gate prevents spending the fresh worker cycle on this known gap.

The finalizer chooses the latest active entitlement for the partner **without
filtering entitlement_scope**. No runtime accounting code is changed. The seed
refuses foreign/ambiguous rows and the gate requires exactly one correct active
`sponsored_packets` row, so wrong-scope authority cannot reach the Clinic worker.
That negative is a harness refusal, not a claim that the existing finalizer
implements a scope filter.

**Live readiness is BLOCKED, not PASS.** Packet capacity is still absent and the
78ef expired validating lease still requires its own exact authorized retirement.
These are the confirmed remaining live blockers. Local closure proves the
proposed seed and fresh journey; it does not claim the hosted journey passed.

## Bounded packet capacity

The synthetic row is fixed at `77000000-0000-4000-8000-000000000058` and bound to
partner `bc1ed720-681e-4da5-9964-acb2affd5b12` / `mvl-demo`. Scope is
`sponsored_packets`, overage is disabled, overage cap is zero, pause-at-cap is
true. A synthetic ownership note prevents adoption of unrelated authority.
Effective time is set only at insertion; expiry is null within this explicitly
bounded Acceptance fixture. Wrong project refuses before SQL construction.

Let C be consumed ledger rows for this exact entitlement, and R be the minimum
of the immutable decision's two participants, remaining screening allowance and
remaining exact-event sponsorship allocation. The seed sets packet_cap=C+R.
It retains the entitlement identity, every credit and all consumption counters.
The existing screening seed no longer replenishes screenings_allowed on conflict.
Event allocation remains two and completed event provenance is never reset.

Before consumption, repeated seed is unchanged at cap 2. After one successful
publication C=1,R=1, so cap stays 2 and repeated seed remains unchanged. An
exhausted event or screening allowance refuses further seeding; there is no silent
third packet or unbounded refill. Refunding or replenishing the event would need
new owner authority, outside this repair. Seed derivation locks the entitlement,
ledger and screening/event inputs; the full bounded seed transaction rolls back
on refusal. No other partner's entitlement is changed.

## Pre-worker gate

The existing rank-one/no-predecessor/no-housekeeping assertions remain in place.
The added gate executes before runOneCycle, rechecks the exact READY Preview via
the provider, runs the application's read-only current protected verification
reader, and measures the exact target and current database dependencies. It
requires active route registration, worker-static specification equality, valid
sponsored_packet_render_authority, exact partner/event/session/item/owner,
transported runtime context and Acceptance URL, packet capacity, screening/event
capacity, absent fresh provenance/generation/delivery/credits, private PDF-only
50MiB bucket, and ten current lifecycle/finalizer fingerprints. The source-derived
disposable database independently matches those measured fingerprints.

Tests mutate each precondition class and the actual browser controller proves a
closure refusal causes zero worker cycles. This is a read-only preflight, not a
reservation or promise against later concurrent changes: canonical runtime gates
still arbitrate the actual claim and finalization.

## Local integration evidence

The existing sponsored-delivery test now uses the current packet application
schema including dependency/retry repairs and attribution successors. The current
Mississippi portion uses real protected verification and current authority,
actual personalized rendering/PDF validation, filesystem upload/readback, actual
finalizeRenderJob and SQL finalizers, then the same fixture's owner delivery.
Supabase client transport and storage transport are disposable local adapters;
they are not live network or Vercel evidence. Missing sparse runtime files are
read from exact Git blobs into temporary test runtime only; the sparse checkout
is not rehydrated.

Positive chain: eligible packet finalization, one consumed packet ledger unit,
one sponsored provenance row, one packet_generated event, one screening use,
claimed-to-consumed session, packet_ready case; identical finalization replay
does not recount. Owner and repeat download return identical validated bytes,
with delivery_authorized, transmission_started and transmission_completed, and
artifact_validated-to-delivered. Anonymous and wrong-owner access are refused.
Database-backed assertions from the current server audit run against this same
fixture. UI staff/reset claims are not fabricated to make an audit pass.

Negative coverage includes missing/expired packet entitlement, cap reached,
wrong partner/scope/event, event exhausted, screening exhausted, wrong verification,
wrong specification, unauthorized runtime context, replay and changed inputs.
SQL-only negative transactions roll back, allowing the separately proven positive
fixture to complete; the blocked live-style state is never represented as repaired.

## 78ef storage and reconciliation — NOT APPLIED

The prior "no output" statement describes **no finalized DB output**, not absent
Storage. The private object is pre-finalization storage residue from the failed
synthetic worker attempt. It is 68,881 bytes at:

`rcap-packet-artifacts-private/packet-artifacts/bc1ed720-681e-4da5-9964-acb2affd5b12/767da280-0c06-4a20-906d-73c5e7570a6c/78efc6af-b4fc-4423-8290-0e3c2e34de07/733889fff7814678e3ad4b4fbebc280cd98daa049cea5c09c1105eb35b95e149.pdf`

Read-only metadata confirms private bucket, exact object ID/path, size and MIME.
The basename contains a content hash; this task did not download/re-hash its live
bytes. The object is not provenance or delivery evidence. Preserve it as failed-run
evidence; no automatic deletion policy was established, and no deletion is proposed.
Its job-ID-qualified path cannot collide with a fresh job.

The same exact retirement remains proposed: prove the full expired-release impact
set is only `78efc6af-b4fc-4423-8290-0e3c2e34de07`, invoke canonical expiry once,
preserve attempt 1 and original claim/render/validation history, terminalize the
resulting failed row and clear next_attempt_at, append immutable authorization
evidence, retain Clinic namespace/sponsorship and unrelated rows. Storage metadata
and private-bucket state are now measured under the guarded transaction, included
in the before-state receipt and verified unchanged afterward. No storage DML.
Disposable tests cover residue drift, immutability, rollback and idempotence.

The default command remains read-only. Apply would require both --apply and
`Roger:acceptance-queue:36204248464:release-expired-exact-clinic-target-and-terminalize`.
No such apply is authorized in this task.

## Linear step-33-through-36 boundary audit

"Live" below distinguishes prior run evidence supplied by the owner from current
read-only measurements. "Local" does not imply a browser or hosted execution.

| Boundary | Required input and current authority | Evidence / local proof | Live exercise and remaining failure modes |
|---|---|---|---|
| Clinic seed | Exact synthetic project/partner/event; separate screening and packet products | Stable C+R packet seed, policy/scope/refill/history negatives | Old seed ran; new packet seed **not applied**, live capacity missing |
| Current DB readback | Accepted migrations/finalizer fingerprints and bucket | Ten fingerprints match current disposable schema; live inventory saved | Read-only measured; future drift refuses |
| Browser screening | Exact Preview, synthetic participant/event access | Existing Clinic contract and real MS verification facts | Prior run reached enqueue; browser/auth/network can still fail |
| Final verification | Protected owner snapshot, current profile/spec | Actual verification reader plus hash; wrong/stale hash negatives | Live current verification valid for78ef; fresh answers must verify |
| Generate/enqueue | Sponsored route and exact owner/matter/source | Real enqueue with application authority; missing authority negatives | Prior run enqueued78ef; new fixture must be fresh |
| Claim-order proof | Rank1, no predecessors, no unrelated housekeeping | Existing controller/mutations plus closure stop-before-worker | Prior rank1 proved; now78ef housekeeping blocks fresh run |
| Worker claim | Accepted immutable image and lease | Canonical claim/fencing in disposable PG |78ef claimed; runtime/network/concurrency remain |
| Personalized render | Current protected payload and static specification | Actual renderPersonalizedClaim on current MS fixture |78ef produced private PDF; new facts may fail validation |
| Local PDF validation | Nonempty PDF/pages and matching bytes | Actual artifact validator on personalized PDF |78ef reached validating; malformed output still refuses |
| Private upload/readback | Private PDF bucket and storage credential | Local storage adapter exact bytes/readback; live bucket contract |78ef object exists; live network/ACL/readback remain unproven for next run |
| Sponsored runtime admission | Preview/channel/route/ordered scope/project, spec/partner/event |51ad context transport and real authority positive/negative tests | Previous run failed here; corrected hosted transport not exercised |
| Packet accounting | Exact effective sponsored_packets row and C+R capacity | Real SQL consumed/eligible; unauthorized/accounting_blocked reproduced | **Missing live entitlement**, must establish before rerun |
| Sponsored publication | Validated owned job/artifact, verification and current registration | Actual scoped finalizer; event/spec/verification negatives | Not yet exercised successfully by this hosted journey |
| Packet-generated accounting | Screening allowance and event allocation | One event/provenance/use, consumed session, ready case; cap negatives | Live counters remain0; concurrent consumption may refuse |
| Owner download | Auth owner, current verification, published eligible artifact | Same MS fixture through actual delivery core; anonymous/other refused | Hosted request/credentials and response remain unproven |
| Delivery event sequence | Opened validated bytes and real stream completion | Three events and delivered state after first response | Hosted stream interruption may produce failure instead |
| Repeat download | Same owned artifact and consumption identity | Identical hash/byte count, unchanged credits/publication | Hosted repeat not yet exercised |
| Cross-owner denial | Participant B cannot own A's item | Real delivery core wrong-owner negative; browser contract | Hosted same-device B denial remains required |
| Staff view | Approved event-scoped staff and packet_ready case | DB packet_ready proven; existing browser assertions unchanged | UI rendering/authorization still must be observed live |
| Device reset | Assisted-session reset and storage clearing | Existing Clinic reset contract preserved | Browser storage/back navigation/reset audit still live-unproven |
| Server audit | Exact delivered job/provenance/credit/reset/cohort | Database-backed current audit checks on same MS fixture | Full audit awaits real staff/reset/browser evidence |

## Release boundary and next authority

Application and all 39 canonical worker inputs must remain byte-equivalent to
`6ebacdcde8afdf8aa706f16b38e0646babcbdc49`; fingerprint
`sha256:c202ebba08c34ce3665f69269fb913078b02188519c5196af7f3639da84dd0d8`,
workerRebuildRequired=false. Existing Preview is reused; no new worker required.
Previous tools receipts remain intact; a separate exact-file overlay pins this
local correction with execution held.

Next owner decisions are separate: integration push of the new local commit;
exact78ef retirement preserving the storage residue; and the bounded synthetic
seed/readback establishing packet capacity. A Clinic rerun is not authorized by
any of those decisions and must still pass the new pre-worker gate.
