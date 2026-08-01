# Phase 48 / PR #87 release runbook

Status: **not authorized to run.** Phase 48 is unapplied locally, on staging and
in production. Nothing in this document is a licence to apply it.

Audit performed against:

- migration: `supabase/phase-48-rcap-document-artifact-storage.sql` on
  `chore/record-clearing-phase-48-hold` (#89), 202 lines, 1 file
- application code: `fix/platform-document-delivery-core` (#87) at
  `e3f034b9c499fc6b6ec906dd82ef8e6599f8951f`

> **Blocking finding — Phase 48 alone does not make #87 deployable.**
> The live packet-generation path writes to two tables that no migration in
> this repository creates. See [§3 Known risks](#3-known-risks-and-unresolved-questions),
> risk R1. R1 is now **decided** (see R1 resolution); implementing it is blocked
> in turn by **R7**, a capacity limit in the Phase 48 `kind` constraint.

---

## 1. Object inventory

Everything the migration creates or alters, read from the SQL rather than
assumed.

### 1.1 Tables

| Object | Operation | Notes |
|---|---|---|
| `public.rcap_document_artifacts` | `create table if not exists` | New. 15 columns. |

Columns: `id` (uuid pk, `gen_random_uuid()`), `document_packet_id` (uuid not
null), `kind`, `storage_bucket`, `object_path`, `byte_size` (bigint),
`checksum_sha256`, `renderer_version`, `source_template_id`, `mapping_id`,
`page_count` (integer), `jurisdiction`, `county`, `created_at` (timestamptz,
`now()`).

### 1.2 Constraints

| Constraint | Object | Operation |
|---|---|---|
| `rcap_document_artifacts_pkey` | new table | implicit primary key on `id` |
| FK `document_packet_id` → `public.rcap_document_packets(id)` | new table | `on delete cascade` |
| `rcap_document_artifacts_kind_check` | new table | `kind in ('court','full')` |
| `rcap_document_artifacts_byte_size_check` | new table | `byte_size > 0` |
| `rcap_document_artifacts_checksum_check` | new table | `checksum_sha256 ~ '^[0-9a-f]{64}$'` |
| `rcap_document_artifacts_page_count_check` | new table | null or `> 0` |
| `rcap_document_artifacts_packet_kind_unique` | new table | **unique `(document_packet_id, kind)`** — the idempotency guarantee |
| `rcap_document_packets_status_check` | **existing table** | dropped and recreated |
| `rcap_document_packets_document_failure_code_check` | **existing table** | dropped if exists, created |

### 1.3 Indexes

| Index | Operation |
|---|---|
| `rcap_document_artifacts_packet_idx` on `(document_packet_id)` | `create index if not exists` |
| `rcap_document_artifacts_jurisdiction_idx` on `(jurisdiction, created_at)` | `create index if not exists` |

Both are on the newly created table, so neither builds against existing rows.
Note the unique constraint already provides a `(document_packet_id, kind)`
index; `rcap_document_artifacts_packet_idx` is a redundant left-prefix of it.
Harmless, but it is dead weight on every insert.

### 1.4 Columns added to an existing table

| Table | Column | Type | Default |
|---|---|---|---|
| `public.rcap_document_packets` | `document_ready_at` | `timestamptz` | none, nullable |
| `public.rcap_document_packets` | `document_failure_code` | `text` | none, nullable |

Both use `add column if not exists`.

### 1.5 Status vocabulary change

`rcap_document_packets_status_check` is replaced. Comparing against the
original definition in `supabase/phase-19-mississippi-document-generator.sql`:

- **Before (8):** `draft_started`, `form_in_progress`, `saved_for_later`,
  `missing_information`, `ready_for_review`, `preview_generated`, `exported`,
  `blocked_review_required`
- **After (11):** the same 8, plus `document_generating`, `document_ready`,
  `document_failed`

The new set is a **strict superset**. No previously legal value becomes
illegal, so no existing row can violate the new constraint. `preview_generated`
is retained deliberately and merely stops being the terminal success state.

`document_failure_code` is constrained to null or one of seven codes:
`jurisdiction_not_packet_ready`, `source_template_unavailable`,
`mapping_not_approved`, `render_failed`, `invalid_pdf_output`,
`storage_unavailable`, `storage_write_failed`. These match
`PacketFulfillmentFailureCode` in `src/lib/rcap/documents/artifact-service.ts`
exactly — all seven, no drift in either direction.

### 1.6 Storage

| Object | Operation |
|---|---|
| bucket `rcap-document-packets-private` | `insert … on conflict (id) do update` |

Private (`public = false`), 20 MiB file size limit (20971520 bytes), MIME
allow-list `['application/pdf']`.

No `storage.objects` policies are created for this bucket. Under RLS that
denies every browser JWT role by default; only the service role reaches
objects, through the admin client. This matches the phase-43 onboarding private
bucket precedent.

### 1.7 Row level security

| Object | Operation |
|---|---|
| `public.rcap_document_artifacts` | `enable row level security` |
| policy `rcap_document_artifacts_service_role_all` | `drop policy if exists` then `create policy` |

The policy grants `all` to `service_role` with `using (true) with check (true)`.
No `anon` or `authenticated` policy exists, so those roles are denied by
default.

### 1.8 Functions, triggers

None. The migration creates no function and no trigger.

---

## 2. Additive / idempotent assessment, with evidence

### 2.1 Additive — yes, with one qualification

| Operation | Additive? | Evidence |
|---|---|---|
| create table | yes | new relation, no existing object touched |
| create indexes | yes | on the new table only |
| add 2 columns | yes | nullable, no default, no backfill, no rewrite |
| status constraint | yes | new value set is a strict superset (§1.5) |
| failure-code constraint | yes | constrains a column created in the same migration; no existing row has a value |
| bucket insert | yes | `on conflict do update`, converges to the intended config |
| enable RLS + policy | yes | on the new table only |

**Qualification:** `drop constraint if exists rcap_document_packets_status_check`
followed by `add constraint` is *momentarily* subtractive. It is inside the
transaction (§2.3), so no other session ever observes the unconstrained window.
Not a live risk; recorded because "purely additive" would be imprecise.

### 2.2 Idempotent on a second run — yes

Every statement is re-runnable:

- `create table if not exists`, `create index if not exists`,
  `add column if not exists` — guarded.
- `drop constraint if exists` before each `add constraint` — this is what makes
  the constraint work idempotent. PostgreSQL has no
  `add constraint if not exists`, so the drop-then-add is the correct idiom, not
  an oversight.
- `insert … on conflict (id) do update` on the bucket.
- `drop policy if exists` before `create policy`.

A second run is a no-op in effect. **Verified by reading; not executed** — the
migration has not been run anywhere.

### 2.3 Transactional — yes

The whole migration is wrapped in `begin;` / `commit;` (lines 25 and 187). All
statements used are transactional DDL in PostgreSQL, including the
`storage.buckets` insert. A failure at any point rolls back completely; there is
no partial-application state to clean up.

### 2.4 Destructive, locking, data-rewriting — assessed

- **Destructive:** no. No `drop table`, `drop column`, `delete`, `truncate` or
  `update` of existing rows. No column type change.
- **Data-rewriting:** no. Both added columns are nullable with no default, which
  is a catalogue-only change in PostgreSQL 11+ — no table rewrite.
- **Locking:** yes, briefly. Two `alter table` blocks take `ACCESS EXCLUSIVE` on
  `rcap_document_packets`, and **`add constraint … check` validates by scanning
  the whole table** while holding that lock. On a large
  `rcap_document_packets` this blocks all reads and writes for the duration of
  the scan. See risk R2.
- **Non-transactional:** none. No `create index concurrently` (which would be
  the usual reason to break out of the transaction).

### 2.5 Old application code after the migration, before #87 deploys — safe

Currently deployed code never writes `document_generating`, `document_ready` or
`document_failed`; those literals exist only on the #87 branch. Widening the
status constraint cannot break a writer that never uses the new values. The two
new columns are nullable and unread by old code. The new table and bucket are
unreferenced. **Applying Phase 48 ahead of the #87 deploy is safe** and is the
correct ordering.

### 2.6 #87 code before the migration exists — unsafe, but fails closed

If #87 deployed against a database without Phase 48:

| Path | Behaviour |
|---|---|
| `getStoredPacketArtifact` | `from("rcap_document_artifacts")` errors; the function returns `null` on `error \|\| !data` (artifact-service.ts:111), so a missing table is indistinguishable from "no artifact" |
| download route | reads `null` → `409 document_not_ready` (route.ts:79) |
| `setStatus`/`markReady`/`recordFailure` | writes to non-existent columns fail; **return values are not checked** (artifact-service.ts:273–311), so failures are silent |
| `uploadPacketArtifact` | bucket missing → `storage_write_failed` |

Net effect: no packet is served and none is marked ready. It fails closed, which
is the right direction. But it fails **silently** — a missing table is reported
to the participant as "not prepared yet", and the status writes swallow their
errors. That is acceptable for a fail-closed guarantee and poor for operability;
it is why the preflight in §5 checks for the objects explicitly rather than
inferring health from the route's behaviour.

### 2.7 Exact dependency: migration objects → artifact-storage helpers

| Migration object | Consumer | Reference |
|---|---|---|
| bucket `rcap-document-packets-private` | `PACKET_ARTIFACT_BUCKET` | `artifact-storage.ts:10` **and** `packets/store.ts:152` — two independent declarations of the same literal |
| table `rcap_document_artifacts` | `getStoredPacketArtifact`, `fulfillPacketArtifact` | `artifact-service.ts:105, 232` |
| unique `(document_packet_id, kind)` | race-loser recovery treats a conflict as success | `artifact-service.ts:250–257` |
| `document_ready_at` | `markReady` | `artifact-service.ts:288` |
| `document_failure_code` | `markReady` (clears), `recordFailure` (sets) | `artifact-service.ts:291, 307` |
| statuses `document_generating` / `document_ready` / `document_failed` | `setStatus`, `markReady`, `recordFailure`; download route reads them | `artifact-service.ts:176, 289, 306`; `route.ts:69, 76` |

Object-path scheme: `packets/{packetId}/{kind}.pdf`, built by
`buildPacketObjectPath` (`artifact-storage.ts:46`) and independently validated
by `assertSafeObjectPath` (`artifact-storage.ts:113`), which pins the path to
exactly three segments, a UUID, and `court.pdf` or `full.pdf`. The bucket's
20 MiB limit and PDF MIME allow-list are enforced server-side by Storage and are
not duplicated in application code — a packet exceeding 20 MiB surfaces as
`storage_write_failed`, not as a validation error.

---

## 3. Known risks and unresolved questions

### R1 — BLOCKING: the live generation path needs tables no migration creates

The packet path that actually runs in production is:

```
POST /api/rcap/packets/generate
  → lifecycle.fulfillPacket            (src/lib/rcap/packets/lifecycle.ts)
    → resolvePacketStore()             (src/lib/rcap/packets/store.ts:279)
      → SupabasePacketRepository       (store.ts:175)
```

`SupabasePacketRepository` reads and writes:

- `rcap_packet_fulfillments` — store.ts:181, 191, 200, 218
- `rcap_packet_artifacts` — store.ts:229, 253, 264

**Neither table is created by Phase 48, and neither appears in any file under
`supabase/`.** Verified by grep across the whole migration directory: zero
matches for either name.

Meanwhile `rcap_document_artifacts` — the table Phase 48 *does* create — has no
writer. `fulfillPacketArtifact`, the only function that inserts into it, has
**zero callers** in `src/` and `scripts/`. The download route consumes only the
two read functions.

So after Phase 48 is applied and #87 is deployed:

1. `POST /packets/generate` fails at the first repository call — the table does
   not exist.
2. `GET /documents/{id}/pdf/{kind}` finds no artifact and returns
   `409 document_not_ready`, permanently, because nothing writes that table.

The two lanes are also disconnected from each other by design mismatch, not
just by a missing migration: generate records artifacts keyed by
`(fulfillment_id, component_id)`, while the download route looks them up by
`(document_packet_id, kind)`. Reconciling them is a design decision, not a
mechanical fix.

**Why the gates did not catch this.** The HTTP acceptance harness sets
`process.env.RCAP_PACKET_STORE_DRIVER = "local"`
(`scripts/verify-rcap-packet-http-acceptance.mjs:18`), which selects
`LocalPacketStorage` + `LocalPacketRepository` — filesystem and in-process maps.
The gate proves the *lifecycle logic*, over real HTTP, with no Supabase schema
involved. It cannot and does not prove that the production adapter's tables
exist. That is a correct thing for CI to do and a gap in release assurance.

**Consequence for this runbook:** the staging sequence in §4 must not begin
until R1 is resolved by an explicit decision. Phase 48 is necessary but not
sufficient. Applying it changes nothing about R1 — it neither helps nor hurts.

### R1 resolution — DECIDED

**The canonical production persistence lane is the Phase 48 artifact-service
model.** Authorized by Roger, 2026-08-01.

```
rcap_document_packets
  → renderer
  → private object storage
  → rcap_document_artifacts
  → authenticated artifact download
```

- `fulfillPacketArtifact` — or a clearly named replacement preserving the same
  Phase 48 lifecycle and schema — is the canonical artifact write service.
- `packets/store.ts` **adapts to this model**. It is treated as an unfinished or
  superseded persistence abstraction.
- `rcap_packet_fulfillments` and `rcap_packet_artifacts` **will not be created**.
  The fact that `SupabasePacketRepository` currently writes to them is not
  authorization to add a second database model.
- **No second production persistence schema will be created.**
- The authenticated download route stays on `rcap_document_artifacts` and will
  not be rewritten around the nonexistent tables.
- Local/in-memory storage may remain for renderer-focused unit tests, but must
  not be the only HTTP acceptance proof and must never be selected in
  production.

Implementation belongs on the platform-core lane associated with #87, as one
focused forward-only change. It must not be mixed into
`feat/record-clearing-batch-2-legal-design`.

**Implementation is currently blocked by R7.**

### R7 — BLOCKING: the Phase 48 `kind` constraint cannot represent an approved packet

Implementing the R1 decision requires a deterministic mapping from component
identity to artifact `kind`. That mapping cannot be built against the current
schema without violating one of its own required properties.

**The constraint.** Phase 48 defines:

```sql
constraint rcap_document_artifacts_kind_check check (kind in ('court', 'full'))
constraint rcap_document_artifacts_packet_kind_unique unique (document_packet_id, kind)
```

Two permitted values, unique per packet ⇒ **a packet can hold at most two
artifacts.**

**The packet that does not fit.** `technical-fixture-pleading-set`
(`src/lib/rcap/packets/registry.ts:124`), reached through relief track
`technical-fixture-pleading`, resolves to **four** distinct components:

| # | `componentId` | `role` | order | requirement | Intended participant-visible download |
|---|---|---|---|---|---|
| 1 | `pleading-primary` | `primary_filing` | 1 | required | The petition the participant files with the court |
| 2 | `pleading-proposed-order` | `proposed_order` | 2 | required | The order the judge signs — filed with, but distinct from, the petition |
| 3 | `pleading-certificate-of-service` | `certificate_of_service` | 3 | required | Proof of service on the prosecutor; a separately filed document |
| 4 | `pleading-fee-waiver` | `fee_waiver` | 4 | conditional (`requestsFeeWaiver`) | The fee-waiver application, filed only when the participant requests it |

All four are separately rendered PDFs (`lifecycle.ts:141–219` renders, validates
and stores each one independently) and all four are separately downloadable
today at `/api/rcap/packets/{fulfillmentId}/components/{componentId}`.

`technical-fixture-acroform-set` (registry.ts:66) is a second, smaller instance:
`acroform-primary` (`primary_filing`) plus `acroform-instructions`
(`instructions`). Its own source comment states the design intent directly —
*"Mixed-strategy packet set: an official form plus generated instructions.
**Proves a packet is not one PDF.**"* (registry.ts:85–86).

**Why no mapping resolves this.** With four legitimately distinct components and
two available kinds, any total mapping must either:

- collapse three components onto one `kind`, which the unique constraint turns
  into an overwrite — forbidden by the mapping requirement *"never overwrite two
  legitimately distinct components under one kind"*; or
- drop components, silently removing a participant-visible filing document —
  which for `proposed_order` or `certificate_of_service` means the participant
  files an incomplete set.

Neither is acceptable. Merging all components into one assembled `full` PDF is
also rejected: it destroys the per-component `sourceIdentity`, `sourceSha256`,
`rendererStrategy` and `rendererVersion` provenance that Phase 48's own columns
exist to record, and it contradicts the accepted "a packet is not one PDF"
design.

**Scope note.** All 10 tracks in `RELIEF_TRACKS` currently carry
`technicalFixture: true` and `runtimeDisabled: true` (`registry.ts:261–274`) —
consistent with zero enabled jurisdictions and zero `packet_ready` tracks. So no
*legally* approved participant packet is affected today. The blocker is
nonetheless real and must be resolved before implementation, for two reasons:
the fixture packets are the only packets the required database-backed acceptance
proof can exercise, and the four-component shape is the ordinary shape of a real
expungement filing, not an artifact of the fixture.

**Smallest schema extension required.** Move artifact identity from `kind` to
the component, which the packet model already treats as the stable artifact key
(`types.ts:147` — *"Stable across versions. Used as the artifact key."*):

```sql
alter table public.rcap_document_artifacts
  add column if not exists component_id text not null;

alter table public.rcap_document_artifacts
  drop constraint if exists rcap_document_artifacts_packet_kind_unique;

alter table public.rcap_document_artifacts
  add constraint rcap_document_artifacts_packet_component_unique
    unique (document_packet_id, component_id);
```

That is one added column, one dropped constraint, one added constraint.

- `kind` is **retained unchanged**, as the coarse court-facing / participant-
  facing classification its comment describes, but stops carrying uniqueness.
- Idempotency identity becomes `(document_packet_id, component_id)`, preserving
  the "a retry conflicts rather than fulfilling twice" guarantee at
  per-component granularity.
- Multiple artifacts per packet are preserved, with no component able to
  overwrite another.
- The authenticated download route continues to serve by `kind` for the
  court/full rendition, and the per-component route continues to serve by
  `componentId`. Both read the same canonical table.

Because Phase 48 is unapplied everywhere, this is a **forward edit to #89**, not
a follow-up migration. It stays additive, idempotent and transactional.

**This is not a return to the second persistence model.** It extends the
canonical Phase 48 model by exactly one column so that model can express the
packets the platform already builds.

**Decision required from Roger before implementation proceeds:** approve the
three-statement extension to #89 above, or specify a different resolution.

### R2 — Whole-table validating scan under ACCESS EXCLUSIVE

`add constraint rcap_document_packets_status_check` validates against every
existing row while holding `ACCESS EXCLUSIVE`. Duration is proportional to
`rcap_document_packets` size, which is **not known from the code** and could not
be measured (no database access in this lane).

Containment, if the table proves large: add the constraint `NOT VALID`, then
`VALIDATE CONSTRAINT` in a separate transaction, which takes only
`SHARE UPDATE EXCLUSIVE` and does not block reads or writes. Both new
constraints support this. **Do not restructure the migration for this reason
without measuring first** — see §5 preflight P4.

### R3 — Duplicate bucket-name constant

`PACKET_ARTIFACT_BUCKET = "rcap-document-packets-private"` is declared twice, in
`artifact-storage.ts:10` and `packets/store.ts:152`, with no shared import. They
agree today. Nothing prevents them drifting, and a drift would send writes to a
bucket the reader never checks. Low severity, trivially fixed, worth fixing
before either lane is wired.

### R4 — Redundant index

`rcap_document_artifacts_packet_idx` on `(document_packet_id)` duplicates the
left prefix of the unique constraint's index. Costs write throughput and space
for no read benefit. Cosmetic; not worth a migration of its own, worth folding
into any future revision.

### R5 — Silent status writes

`setStatus`, `markReady` and `recordFailure` discard the Supabase result
entirely (`artifact-service.ts:273–311`). A failed status write is invisible.
The system still fails closed — a packet that is not marked ready is not served
— but an operator cannot distinguish "never attempted" from "attempted and the
write failed". Recommend checking and logging the error before this lane goes
live.

### R6 — Unresolved: rollback step 3 has no tested procedure

The migration's own rollback notes (lines 189–203) require that rows in the
three new statuses be moved back before the old constraint can be restored. No
script does this. See §9.

### PR #87 remains operationally blocked

#87 must not be released until **all** of the following hold:

1. The production generate route writes canonical artifacts through the Phase 48
   artifact-service lane (R1 resolution) — **not done, blocked by R7**.
2. R7 is resolved: the `kind`/uniqueness capacity limit is lifted so a
   multi-component packet can be represented — **not done, awaiting decision**.
3. The database-backed acceptance proof passes against a real Phase 48 schema
   and the production repository selection — **not written, blocked by R7**.
4. Phase 48 is validated on staging per §4–§6 — **not started**.
5. The Phase 48 migration is applied **before** the new application code is
   deployed (§2.5, §2.6 establish this ordering) — **not started**.

Merging #87 is separately prohibited until it can merge with a merge commit
after the release sequence is authorized.

### Unresolved questions

1. ~~R1's lane question — which path is production?~~ **Resolved**: the Phase 48
   artifact-service model. See R1 resolution.
2. R7: approve the three-statement extension to #89, or specify another
   resolution.
3. Row count of `rcap_document_packets` in staging and production (R2).
3. Whether `rcap-document-packets-private` already exists in either environment
   from an earlier manual step — the `on conflict do update` would silently
   adopt and reconfigure it.
4. Whether any environment has had Phase 48 applied manually. Assumed no;
   preflight P1 confirms.

---

## 4. Staging order

**Not authorized. Do not run any step below without Roger's explicit
instruction, and not at all until R1 is resolved.**

| # | Step | Gate before proceeding |
|---|---|---|
| 0 | Resolve R7 — extend #89 so a multi-component packet is representable | Extension reviewed; #89 still draft and unapplied |
| 1 | Implement the R1 decision: generate route writes canonical artifacts | DB-backed acceptance proof green |
| 2 | Take a verified staging database snapshot | Restore tested, not just taken |
| 3 | Run §5 preflight | All checks pass |
| 4 | Apply `phase-48-rcap-document-artifact-storage.sql` to staging in a single transaction | `commit` returns clean |
| 5 | Re-run §5 preflight as a post-check | Objects present, RLS on, bucket private |
| 6 | Confirm the currently deployed (pre-#87) app still behaves | No status-constraint errors in logs |
| 7 | Deploy #87 to staging | Build clean |
| 8 | Run §6 acceptance test | All 10 items pass |

Order rationale: the migration precedes the deploy because §2.5 shows old code
is safe with the new schema, while §2.6 shows new code is not safe without it.

---

## 5. Staging preflight checks

Run against staging **before** applying.

- **P1 — not already applied.** `to_regclass('public.rcap_document_artifacts')`
  is null; `document_ready_at` and `document_failure_code` absent from
  `information_schema.columns` for `rcap_document_packets`.
- **P2 — prerequisite present.** `phase-47-rcap-onboarding-launch-readiness.sql`
  is applied (the migration header names it as the predecessor), and
  `public.rcap_document_packets` exists with a `uuid` primary key `id` for the
  FK to bind to.
- **P3 — no conflicting status rows.** Zero rows in `rcap_document_packets`
  whose `status` is outside the 8 currently legal values. A row outside both
  sets would fail the new constraint and abort the transaction.
- **P4 — measure before deciding on R2.** Record
  `count(*)` and `pg_total_relation_size('public.rcap_document_packets')`. If
  the count is large enough that an `ACCESS EXCLUSIVE` scan exceeds the
  acceptable staging write-pause, switch to the `NOT VALID` + `VALIDATE`
  variant in R2 **and re-review the modified SQL as a change to #89**.
- **P5 — bucket state.** Record whether `rcap-document-packets-private` already
  exists in `storage.buckets` and, if so, its current `public`,
  `file_size_limit` and `allowed_mime_types`, so the `do update` is a known
  change rather than a silent one.
- **P6 — `gen_random_uuid()` available.** `pgcrypto` (or PG13+ built-in)
  present; the table's primary key default depends on it.
- **P7 — service role reachable.** The deployment's admin client can
  authenticate as `service_role`; every artifact read and write depends on it.

---

## 6. Staging acceptance test

Runs **after** a future authorized migration application and #87 deploy. Every
item exercises real behaviour over the real HTTP route against real Supabase —
not the local driver, and not a unit assertion.

> Blocked by R7. Items 1–3 cannot pass until the generate route writes canonical
> artifacts (R1 resolution), which in turn requires a schema able to hold more
> than two artifacts per packet.
>
> This section is the *staging* acceptance test, run against a real environment.
> It does not replace the **database-backed acceptance proof** required before
> staging — an ephemeral Postgres/PGlite database carrying the real Phase 48
> schema, driving the production repository selection rather than
> `RCAP_PACKET_STORE_DRIVER=local`. The existing local-driver HTTP test may
> remain as a fast test, but it is not production-path proof.

| # | Test | Pass condition |
|---|---|---|
| 1 | Generate a fixture packet through the real HTTP route | `POST /api/rcap/packets/generate` with a technical fixture returns 201; no real jurisdiction or track is involved |
| 2 | Artifact bytes are stored | A `storage.objects` entry exists under `rcap-document-packets-private` at `packets/{id}/{kind}.pdf`; its byte length and SHA-256 equal the recorded `byte_size` and `checksum_sha256` |
| 3 | Retry reuses rather than duplicating | Repeat the identical request. Exactly one artifact row for `(packet, kind)`; same `object_path` and `created_at`; response reports reuse; no second Briefcase item, payment effect or sponsored-usage increment |
| 4 | Authenticated owner downloads the exact stored PDF | `GET /api/rcap/documents/{id}/pdf/{kind}` as the owner → 200, `content-type: application/pdf`, and the response bytes' SHA-256 equals the stored `checksum_sha256` byte-for-byte |
| 5 | Unauthenticated request denied | Same GET with no session → 404 `packet_not_found` (deliberately not 401/403, so identifiers cannot be probed) |
| 6 | Another user denied | Same GET as a different authenticated participant → 404 `packet_not_found`; no bytes in the body |
| 7 | Cross-jurisdiction source request denied | Request a packet whose jurisdiction differs from the resolved source template → `jurisdiction_not_packet_ready`; no artifact row and no stored object. This is the Mississippi-fallback regression: no jurisdiction may render onto another's form |
| 8 | Storage failure cannot mark a packet ready | Inject a write failure. Packet ends `document_failed` with `document_failure_code = 'storage_write_failed'`; `document_ready_at` stays null; no artifact row; the download route returns 409, never 200 |
| 9 | Missing artifact returns a truthful error | Delete the stored object, leaving the row. `GET` → 503 `storage_unavailable` with no internal path, bucket name or stack trace in the body |
| 10 | Nothing became enabled | After all of the above: zero jurisdictions enabled, zero tracks `packet_ready`, launch gate still red. Confirm by re-running `rcap:verify-packet-delivery-ready-jurisdictions` and the capability registry gate |

Item 10 is the one that must be re-checked last, after every other item has
mutated state.

---

## 7. Production order

**Not authorized.** Requires a green staging run of §6 in full, plus explicit
instruction.

| # | Step |
|---|---|
| 1 | Staging §6 passed in full, including item 10 |
| 2 | Verified production database backup; restore rehearsed |
| 3 | Announce a write-pause window sized by the P4 measurement |
| 4 | Run §5 preflight against production |
| 5 | Apply Phase 48 in a single transaction |
| 6 | Post-check: objects present, RLS enabled, bucket private |
| 7 | Confirm the still-deployed pre-#87 app is healthy (§2.5) |
| 8 | Deploy #87 |
| 9 | Run §8 smoke test |

Steps 5 and 8 are separate decisions with an explicit health check between them.
Do not collapse them.

---

## 8. Production smoke test

Read-only or fixture-only. Touches no real participant record.

1. `rcap_document_artifacts` exists, RLS enabled, exactly one policy, scoped to
   `service_role`.
2. `rcap-document-packets-private` is `public = false`, 20 MiB limit, PDF-only
   MIME allow-list.
3. `storage.objects` has no policy granting `anon` or `authenticated` access to
   that bucket.
4. Both new columns exist on `rcap_document_packets` and are nullable.
5. Status constraint accepts all 11 values; a nonsense value is still rejected.
6. Unauthenticated `GET` on any packet PDF route → 404. No bytes.
7. Zero jurisdictions enabled; zero tracks `packet_ready`; launch gate red.
8. Error logs show no status-constraint violations and no
   `storage_write_failed` in the window following the deploy.

Stop and consider rollback (§9) if 1–5 fail. Stop immediately and roll back if
6 or 7 fails — those are containment failures, not defects.

---

## 9. Rollback / containment plan

### 9.1 Failure during application

No action needed. The migration is one transaction (§2.3); a failure rolls back
completely and leaves no partial state. Re-run after fixing the cause — it is
idempotent (§2.2).

### 9.2 After a successful apply, before #87 deploys

Prefer **containment over rollback**. The schema is inert: nothing reads or
writes the new objects until #87 ships (§2.5). Leaving it applied costs nothing
and carries less risk than reversing DDL. Do not roll back reflexively.

### 9.3 After #87 deploys

Roll back the **application**, not the schema. Reverting #87 returns the system
to a state where the Phase 48 objects are unused but harmless. This is the fast,
safe path and should be the default.

### 9.4 Full schema reversal — last resort

Order matters, and steps 3 and 4 have prerequisites the SQL's own notes flag:

1. Delete all objects under `rcap-document-packets-private`, **then**
   `delete from storage.buckets where id = 'rcap-document-packets-private'`.
   The delete fails while objects remain.
2. `drop table public.rcap_document_artifacts;` — this discards the record of
   which document was served, from what template, at what checksum. **Export it
   first if any packet was fulfilled.** The FK is `on delete cascade` in the
   other direction, so dropping this table does not touch
   `rcap_document_packets`.
3. Move any row whose status is `document_generating`, `document_ready` or
   `document_failed` back to `ready_for_review` — otherwise the restored
   constraint refuses to validate.
4. Restore the previous constraint: the 11-value set minus the three new values,
   as listed in §1.5.
5. `alter table public.rcap_document_packets drop column if exists
   document_ready_at, drop column if exists document_failure_code;`

**R6 stands:** no script performs step 3, and no rehearsal of this sequence has
been done. Rehearse on a staging restore before ever needing it in production.

### 9.5 Required Supabase and storage permissions

Applying: a role with `CREATE` on schema `public`, `ALTER` on
`public.rcap_document_packets`, `INSERT`/`UPDATE` on `storage.buckets`, and the
right to enable RLS and create policies — in practice the Supabase service role
or the SQL editor's owner role. The `anon` and `authenticated` roles need and
receive nothing.

Running: only the deployment's `service_role` admin client. No browser role is
granted any access to the artifact table or the bucket, by design.

---

## 10. Enablement statement

This migration, and this runbook, enable nothing.

- **Zero** tracks are `packet_ready`.
- **Zero** jurisdictions are enabled.
- The launch gate remains **red**.
- Phase 48 is **unapplied** — locally, on staging, and in production.
- PR #87 and PR #89 remain **unmerged**; #89 remains a **draft**.
- No deployment has occurred.
- Batch 1 legal design remains frozen at `batch1-legal-design-complete`
  (`aeaceb9`); nothing here alters a Batch 1 conclusion, approval baseline or
  completion artifact.

Applying a migration is a schema change. It is not a legal-design approval, and
it does not make any jurisdiction or track available to a participant. Those
remain separate, explicit, counsel-gated decisions.
