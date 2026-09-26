# Clinic worker Preview context — run 36204248464

Parent Captain: `579febaaddc5a004d824b74f486e567115db4db2`.
Local repair only. No Acceptance writes, rerun, deployment, push, worker build,
worker publication, or Production operation is authorized or performed here.

## Failure and correction

The owner's run record proves target-first admission, zero historical queue or
housekeeping predecessors, and one worker claim of
`78efc6af-b4fc-4423-8290-0e3c2e34de07`. It reached rendering and validating, then
returned `render_failed` with null disposition. Unlike run 36186574507, this was
a worker runtime-context failure after claim, not a queue precondition failure.
The supplied Actions result is not claimed as a newly downloaded artifact.

The Clinic adapter extracts the payment harness's canonical worker cycle. That
Docker invocation includes database credentials and ENABLE_SUPABASE_PARTNER_DATA,
but no sponsored Preview runtime context. The image's NODE_ENV=production falls
through resolveDeploymentEnvironment() to production. The unchanged
currentSponsoredChannelAllowed() correctly refuses. Executable tests reproduce
this refusal and admission with the corrected context against actual source.

The Clinic-only adapter now derives the channel, route state and exact ordered
participant scope from the existing immutable sponsored decision and current
release/tools deployment scope. It cross-checks the provider-verified Preview,
application/worker tuple, Acceptance project, scope hash, participant and named
partner/event before reading service credentials. Both VERCEL_ENV and
VERCEL_TARGET_ENV are explicitly preview, preventing an inherited classifier
conflict; NODE_ENV stays production. All five variables are inserted before the
immutable image argument. No host mount, new image or worker source change.
The nonsecret context is saved with the run evidence. Service credentials remain
transported through environment, not argv.

The existing sponsored admission, specification hash, partner/event checks,
participant scope and Clinic target-first controller remain unchanged. Payment's
shared worker invocation and target-following behavior also remain unchanged.
The exact successor Preview must be reused: `dpl_EopdPGhnhjk8JqwdiAqi9RYmATpB`.

## Read-only measurement and separate failed fixture

The accompanying inventory was measured through a read-only transaction against
Acceptance `hyflxnlhpmiqxvvcoiia`. The target remains validating, attempt 1/5,
with its original expired lease and fencing token present (token not exported).
There is no output, provenance, delivery, credit ledger, reservation, generation
event or payment consumption. Sponsor usage and overages remain zero.

Exact namespace:

- job `78efc6af-b4fc-4423-8290-0e3c2e34de07`
- packet `1a9afd62-b6aa-4b2b-8cb6-b2173fd9d9c3`
- render matter `767da280-0c06-4a20-906d-73c5e7570a6c`
- item `77ffebba-2b7b-4bad-8e57-1846cb7b02fe`
- session `dec7959c-a4a8-4f96-aaa9-2567338b6761`
- case `f54da5be-e95d-46c0-88dd-7b3175e2070e`
- pending claim `28a940d8-8113-4fb0-956f-e4a4f20c3bf5`
- participant `e7c1d76e-dcf2-4d41-b585-ba164806f391`
- event `77000000-0000-4000-8000-000000000055`, partner `mvl-demo`

Current claim order is empty, but expired-lease housekeeping contains this one
target. A fresh Clinic proof therefore remains blocked. The earlier 20 owner
orphans are preserved and nonclaimable; this target is not an orphan.

## Proposed reconciliation — NOT EXECUTED

`scripts/rcap-clinic-failed-target-reconciliation.mjs` defaults to read-only and
requires the exact Acceptance project. Apply additionally requires both --apply
and the separate owner authorization value:
`Roger:acceptance-queue:36204248464:release-expired-exact-clinic-target-and-terminalize`.
The earlier authorization for run 36186574507 does not authorize this operation.

The guarded transaction locks the queue/dependency relations, remeasures the
snapshot and refuses any change. The live function fingerprints and dependency
catalog must still match. The complete eligible set for the existing
release_expired_packet_render_claims() function must be exactly this target,
across all renderer kinds. Only then may that function run once; affected count
must be one. It canonically changes validating to failed/retryable, clears expired
lease/fencing, records timeout and lease expiry, and appends the original claim
state to retry history. Attempt count remains one. The control then changes only
this failed target's disposition to terminal and next_attempt_at to NULL,
appending an immutable before-state and canonical-expiry receipt. Item, case,
session, event, sponsorship and prior error/history remain preserved.

The function has no ID argument; the complete exact-impact guard and locks make
this invocation bounded. Any second eligible row refuses the entire operation.
The transaction verifies unrelated job hash, Clinic state and empty resulting
claim/housekeeping queues before commit. Repeat requires the exact receipt and
terminal state and is a no-op. Disposable PostgreSQL verifies actual guards,
expired-fence refusal, unsafe direct-transition refusal, infinity-hold
insufficiency, drift refusal, rollback after canonical expiry, preservation and
idempotence. No triggers/grants/functions are relaxed by the control.

An infinity hold is inappropriate: a validating job remains eligible for expired
lease housekeeping regardless of next_attempt_at. Calling worker failure with an
expired fence is also refused. No artificial lease extension or worker execution
is proposed. This plan is fixture retirement, not a retry or a successful journey.

## Release boundary

The previous queue repair receipt is preserved. A new finite, exact-content tools
overlay names only this repair, with execution/push/dispatch/deployment held.
Superseded verifier/test bytes are verified against the prior Captain blob;
current bytes must match the successor overlay. This avoids rewriting historical
pins or a self-referential future commit SHA.

Application/worker source remains `6ebacdcde8afdf8aa706f16b38e0646babcbdc49`.
Required final equivalence: application diff empty, 39 canonical worker inputs
unchanged, fingerprint
`sha256:c202ebba08c34ce3665f69269fb913078b02188519c5196af7f3639da84dd0d8`,
workerRebuildRequired=false. No migration is needed for context transport.
