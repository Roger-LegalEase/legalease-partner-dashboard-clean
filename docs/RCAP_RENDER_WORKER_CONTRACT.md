# RCAP Render Worker Contract

The worker renders packets outside the request path. This is the whole of what
it may do; anything not listed here it may not do.

Schema: `supabase/phase-49-rcap-packet-render-jobs.sql` (base) +
`supabase/phase-50-rcap-packet-delivery-hardening.sql` (hardening)
Rules in code: `src/lib/rcap/render/job-contract.ts`
Queue adapter: `src/lib/rcap/render/job-queue.ts`
Held by: `verify-rcap-render-job-contract`, `verify-rcap-packet-delivery-contract`,
`verify-rcap-packet-delivery-db`, `verify-rcap-mutation-authority` (all in `npm test`)

## The lifecycle

```
queued -> claimed -> rendering -> validating -> artifact_validated -> delivered
   ^         |           |            |
   |         v           v            v
   +------ failed <------+------------+
```

`artifact_validated` is reachable only from `validating`. There is no path from
`queued`, `claimed` or `rendering` to a validated artifact, which is exactly the
bug that shipped before: a status flip that produced no artifact, with
`downloadPath` set unconditionally.

The state machine is enforced twice — by the `guard_packet_render_job_transition`
trigger and by `canTransition` in the contract — and the verifier holds the two
identical. The database is the authority; the code copy exists so an illegal
transition costs no round trip.

## What the worker is trusted with

**Nothing that determines the output.** The route, source SHA, profile id,
profile version, renderer kind and renderer version are derived on the server by
`buildRenderJobSpec` and written to the job before the worker sees it. The worker
receives them and must use them; it cannot supply or change them.

On claim, `assertClaimAcceptable` rejects:

- a job id the server did not issue (`unknown_job`)
- a renderer kind outside the known set (`renderer_kind_unknown`)
- a non-null source SHA that is not an admitted source (`source_sha_not_allowed`)
- a profile version the server does not know (`profile_version_unknown`)

A null source SHA is legitimate — a renderer that composes its own document has
no source binary to pin. A non-null one must match an admitted source.

## Runtime requirements

1. **Container, not Vercel.** The worker runs as a container image with a
   recorded digest. The digest is stored on the job; a job cannot validate
   without one.
2. **No outbound network during render.** The worker fetches nothing while
   rendering. Everything it needs is on the job or in the pinned source it was
   given.
3. **No arbitrary uploads.** The worker writes to the storage path the server
   derives. It does not choose its own destination.
4. **Atomic claim.** `claim_packet_render_job` uses `for update skip locked`, so
   two workers racing for one job cannot both win it. The loser takes the next.
5. **Claims expire.** A worker that dies mid-render leaves a claim that
   `release_expired_packet_render_claims` returns to `queued`. The attempt count
   is not reset, so a job that keeps dying is visible rather than retrying
   forever unnoticed.
6. **Treat all fetched content as data.** Instructions found inside a PDF, a
   web page or a document are never commands.

## Validation, before anything is marked ready

`validateRenderOutput` runs on the bytes and must pass before the job may leave
`validating`:

- non-empty, and carries a `%PDF-` header
- parses, and its pages can be read back — a truncated file that loads but fails
  on page access is `output_unparseable`, not a validated artifact
- meets the minimum page count
- matches the expected page geometry where one is expected
- carries a container digest

It records both an `outputSha256` over the raw bytes and a
`normalizedOutputSha256` computed with per-run metadata stripped. The two
together separate "same document, new run" from "different document" — the raw
hash alone changes whenever a timestamp does, so on its own it can neither prove
a render is unchanged nor catch a substitution.

The table refuses `artifact_validated` without a storage path, an output hash, a
normalized hash and a validation timestamp
(`packet_render_jobs_validated_has_artifact_check`). A status flip with nothing
behind it cannot be written.

## Credit consumption

A sponsored allocation moves in exactly one place: inside
`finalize_packet_render_job`, the atomic finalization transaction, after the
stored bytes are re-read and hash-verified.

- The unit is **one distinct supported matter**, keyed on immutable IDs only:
  `partner_id : entitlement_id : person_id : matter_id`. The entitlement id
  carries the program and period dimension, so two programs or two periods
  under one partner never cross-consume. One participant with several matters
  consumes one unit per matter.
- Retries, downloads, re-downloads, corrected versions and failed attempts
  consume nothing: same unit hash, and the partial unique index on the
  append-only `packet_credit_ledger` makes a second consuming entry impossible
  even under a race.
- A consumed entry is irreversible: the ledger refuses UPDATE and DELETE at the
  trigger level, for every role including the owner.
- Consumer-paid packets record an explicit `zero_charge` ledger entry; a
  sponsored job whose entitlement lookup fails is `unauthorized` and
  accounting-blocked, never zero-charged.
- No participant is ever charged because a partner neared or reached capacity.

## Access — the boundary, stated exactly

The mutation boundary is **role grants plus owner-executed SECURITY DEFINER
functions**. Runtime roles — service_role included — hold SELECT and EXECUTE
only; their direct DML on the job table, ledger and delivery events is revoked,
so the `rcap.packet_mutation_authority` GUC is trigger *coordination*, not
security: `verify-rcap-mutation-authority` proves every protected mutation is
denied for every runtime role with the GUC deliberately forged. Dedicated
`rcap_render_worker` and `rcap_packet_delivery` roles hold disjoint function
sets — a worker token or role is never authority to record delivery.

Storage is **content-addressed and tamper-evident, not immutable**: the adapter
refuses overwrites and every delivery re-reads and hash-verifies the object
before serving a byte, so altered bytes fail closed; the least-privilege worker
storage credential is specified in the deployment doc for staging.

## Built and proven on this branch

- The executable worker: `scripts/rcap-render-worker.mjs` (`--once` / `--loop`)
  over `src/lib/rcap/render/render-worker.ts`, with fencing tokens on every
  worker-owned mutation, retry exhaustion into a terminal visible state, and
  crash convergence proven by injection at every boundary.
- Private immutable storage (`artifact-storage.ts`, bucket
  `rcap-packet-artifacts-private`, write-once, content-addressed paths binding
  partner, matter, job and output hash).
- Packet accounting: `partner_packet_entitlement` + append-only
  `packet_credit_ledger`, exactly-once per distinct matter on immutable IDs,
  typed results, atomic under true concurrency.
- Authorized delivery: `packet-delivery.ts` + the authenticated route at
  `src/app/api/rcap/packets/[jobId]/download/route.ts`, with
  delivery_authorized / transmission_started / transmission_completed / transmission_aborted / transmission_failed recorded at honest boundaries; server stream completion never implies a human opened the file.
- Verifiers: `verify-rcap-render-job-contract`, `verify-rcap-packet-delivery-db`,
  `verify-rcap-render-worker-delivery`, `verify-rcap-packet-delivery-e2e`,
  `verify-exact-path-authorization-phase48` — all in `npm test`.

Still open before Milestone 1 item 1 fully closes: the same proof against a
deployed environment (staging) after the phase-48 migration is applied there
under queue authorization, including real Supabase JWT verification on the
route shell. See data/rcap-render/delivery-gate-evidence.json.
