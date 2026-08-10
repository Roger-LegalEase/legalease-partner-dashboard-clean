# RCAP Render Worker Contract

The worker renders packets outside the request path. This is the whole of what
it may do; anything not listed here it may not do.

Schema: `supabase/phase-48-rcap-packet-render-jobs.sql`
Rules in code: `src/lib/rcap/render/job-contract.ts`
Queue adapter: `src/lib/rcap/render/job-queue.ts`
Held by: `scripts/verify-rcap-packet-render-jobs.mjs` (in `npm test`)

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

A sponsored allocation or paid entitlement moves in exactly one place:
`consume_packet_render_credit`. It returns false — not an error — when the job
has not validated an artifact or the unit is already counted. That is what makes
a retry free.

- The unit is **one distinct supported matter**, keyed
  `partnerSlug:personId:matterId`. One participant with several matters consumes
  one unit per matter.
- Retries, downloads, re-downloads, corrected versions and failed attempts
  consume nothing. They derive the same unit key, and the partial unique index
  on `consumption_unit_key where consumed_credit = true` makes a second
  consumption impossible even under a race.
- A consumed credit is never released by a later status change; the trigger
  raises if one is.
- No participant is ever charged because a partner neared or reached capacity.

## Access

RLS is enabled and **no policy is created** for `anon` or `authenticated`, and
both are revoked on the table. Render jobs are service-role only: the server and
the worker read and write them, participants never do. Partner-facing counts come
from the accounting layer, not from exposing this table.

## Not yet built

- Private storage of the output bytes and the signed re-read on download.
- The worker process itself and its container image.
- The accounting layer that reads validated jobs and reports the four separate
  units (unique participants, completed screenings, supported matters, packet
  sets).
- An HTTP-level verifier against a running deployment.

Until those land, this is a proven contract with no worker behind it. It does not
close Milestone 1 gate item 1.
