# Lane F — captain decisions at integration

Integrated from `claude/grade-a-v5-lane-f`, six commits, replayed onto the
E-integrated captain head. The branch was not merged. All thirteen files were new
or unchanged since the lane's base, so nothing had to be reconciled.

## Patch 1 — the launch graph reads the one authority

`scripts/generate-rcap-launch-graph.mjs` computed `operationallySellable` from
nine operational gates. That was a second commercial rule: two computations of
the same fact, and the second is the one that gets it wrong later. It now reads
`isOperationallySellable`, which asks the single Grade-A authority.

The nine gates are unchanged and still reported. They are diagnostics now, and
both values are emitted side by side — `operationallySellable` from the
authority, `allOperationalGatesMet` from the gates — so a divergence is visible
as data instead of being silently resolved in favour of whichever ran last.

Verified a no-op on the numbers, which is what a change of *source* should be:
`operationallySellable` 0 before and after, 260 rows before and after, and zero
rows where the authority and the gates disagree. No second call site was
created; the generator delegates to the reader that holds the one
`admitCommercial` call, and the acceptance verifier still finds exactly one
governed treatment for `launch_graph_commercial_status`.

## Patch 2 — verifier registered and actually wired

`scripts/verify-rcap-lane-f-commercial-admission.mjs` is registered `wired` and
is in the chain immediately after the Grade-A fulfillment authority checks.
Both facts were asserted in both directions: the disposition says wired and the
command is present. The chain goes to 232 entries and loses none.

## P0 — the residual RCAP job-id download, closed without new DDL

`/api/rcap/packets/[jobId]/download` denied anonymous callers, wrong users,
unclaimed jobs, accounting-blocked jobs and substituted artifacts, and asked the
Grade-A authority nothing. Necessary, not sufficient: none of those asks whether
the route was ever proven to deliver a packet.

**No migration was needed.** The schema inspection came back positive: the
enqueue RPC binds `consumer_briefcase_item_id` and `consumer_auth_user_id` in
the same statement that creates the row, so both have been persisted since that
RPC was written. Only the `getRenderJob` select was missing them. The select,
`rowFromRecord` and `RenderJobRow` are extended; no DDL was added, because
adding a column that already exists would assert a gap that is not there.

The expected verification hash is deliberately *not* read from the job row even
though it could have been snapshotted there. A verification that was current
when the job was queued is not evidence that it is current now, and a material
edit since then must close the door. The treatment reads the **current**
verification from the consumer briefcase item the job is bound to, and a
verification it cannot read is a denial rather than a pass.

**One treatment, two endpoints.** The obvious fix — a second `admitCommercial`
call in the RCAP route — would have been two commercial rules the moment either
was edited. `governPacketDownloadAdmission` is now the single governed treatment;
the consumer packet download delegates to it and the RCAP job-id download calls
it. The acceptance verifier still reports exactly one treatment for
`private_download` and one for `repeat_download`, both resolving into the shared
module.

The gate is placed last in `authorizePacketDownload`, after the integrity
checks. Those are cheap, local and specific, and reaching the gate means the
object is genuinely this job's artifact — so a refusal there is a statement
about commercial authority rather than about the file. Route denial is still
evaluated before participant denial inside the shared treatment, so a request
for an unproven route learns nothing about whose matter it is.

## Patch 3 — the artifact-digest proposal stays a proposal

`docs/rcap/grade-a/lane-f/migration-proposal/consumer-artifact-digest.sql` is
**not** numbered and **not** added to the apply order.

Its value is real but diagnostic: the digest and page count already travel in
`artifact_refs_json`, so delivery, repeat download and the substituted-object
refusal all work without it. What it would add is the ability to ask across the
whole table which stored artifacts no longer reproduce their validated digest.

That does not justify a schema change now. No Grade-A proof depends on it, this
sprint is not authorized to run a migration, and numbering a file that cannot be
applied puts migration history and database state out of step. It is also not
the RenderJobRow verification binding discussed above, and must not be confused
with it — that turned out to need no migration at all.

## Lint

One warning in `packet-generation.ts` (`slug` unused) was confirmed pre-existing
on the captain head before integration; Lane F's additions only shifted its line
number. Zero errors across every accepted Lane F path.
