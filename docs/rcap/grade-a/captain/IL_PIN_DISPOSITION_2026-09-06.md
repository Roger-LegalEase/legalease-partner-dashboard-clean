# Illinois felony-prostitution-relief: disposition of the artifact pin

**Lane:** DEL-C · **Date:** 2026-09-06 · **Base:** `0fcedd773` · **Branch:** `del-c-il-pin-disposition`
**Family:** `il-prostitution-j-vacate-set` · **Route:** `IL:felony-prostitution-relief`

**Disposition: (b). The approved pins stay where the approval is, and the two verifiers
stay red. Nothing was re-pinned. `d4cb7659…` was not added as an approved pin anywhere.**

---

## 1. Which bytes carry owner approval

The decision owner, Roger Roman, approved this family on 2026-09-02 in
`data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json`
(`recordId: OWN-ADOPT-2026-09-02-BATCH-53`), in the 50-family qualification whose owner note is:

> ADOPTED for the limited family-level legal-design purpose stated in this workbook. No
> runtime, technical, visual, payment, sponsorship, or production authority is granted. Any
> substantive legal change or shipping-artifact digest change requires re-review.

and whose travelling condition is recorded once for the whole record:

> Any substantive legal change, or any change to a family's shipping-artifact digest,
> requires re-review. The digests as at this application are recorded per family above, so a
> rebuild is checkable rather than silent.

The digests recorded for this family are:

| fixture | approved sha256 | bytes | pages |
| --- | --- | --- | --- |
| canonical | `7daaa389709afebccd46cdcee56b16c9888eb4ddcda2475c6c1e0b7315b9517d` | 7802 | 3 |
| boundary | `714832a826220e0d1f82363af3aa251d6dd5e3e9d7fb7235450b002cb614705b` | 7980 | 3 |

Verified independently, not taken on trust: `git show 7df60d9df:<fixture>` reproduces both
digests exactly, and the canonical blob is 7802 bytes / 3 pages.

`data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json` carries the
same two digests for this family under the key `sha256ApprovedAndNow`, with
`verdict: COVERED_BY_EXISTING_APPROVAL`. That key name is now false: the digests are
approved, and they are no longer *now*.

**No approval record covers the current bytes.** Searched every file under
`data/rcap-grade-a/legal-decisions/` and `data/record-clearing/legal-decisions/` for
`d4cb7659…` and `ea728bba…`: zero hits. Repo-wide the current digests appear only in
build/queue/evidence artifacts (`product-wiring.json`, `reports/rendered-artifacts.json`,
`RASTER_QUEUE.json`, the vf01/fix02/codex return rows, the registry's `evidenceInputs`
census) — that is, in records of what was *built*, never in a record of what was *approved*.

## 2. Which bytes are current, and what moved them

| fixture | current sha256 | bytes | pages |
| --- | --- | --- | --- |
| canonical | `d4cb765983ed2ed180a74feb1a70b7b5cc43134419b2c497746d8fd188bd2657` | 7895 | 3 |
| boundary | `ea728bba06d2112537e99846f12d78a1c3d7f49eb8ae0f101a94291920bbf25e` | 8073 | 3 |

Moved by **`42defabe4`** — *"Integrate FIX02: the Illinois vacatur proposed order places a
court-owned-fields line between JUDGE and the trailer"* (2026-09-05). Recorded in
`data/rcap-grade-a/packet-factory-24h/fix02/rows.il-vacatur-trailer.json`, which carries both
digest pairs and two byte-identical rebuilds.

`0fcedd773` (DEL-A) later refactored the family's composition into
`scripts/lib/il-prostitution-j-vacate-composition.mjs` and
`src/lib/rcap/grade-a/families/il-prostitution-j-vacate-set.ts` **without** moving the fixture
bytes; only the builder file's own digest moved (`5137c074…` → `993d2c18…`).

### What changed on the page — measured, not quoted from the builder's report

Both fixtures extracted at `7df60d9df` and diffed against the committed bytes, at text level
(`pdftotext -layout`) and at structure level (every `N 0 obj`, every inflated content stream,
the trailer and `startxref`).

Text diff, identical in canonical and boundary, page 3 of 3 (component `proposed_order`):

```
 JUDGE

+(The date of entry and the judge's signature are the Court's. They are left blank.)
+
 Route: obligation:track-pathway:IL:il-prostitution-j-vacate:felony-prostitution-relief
```

Structure diff: exactly one object changes, the page-3 content stream (`obj 10`,
`/Length 1273 → 1336` canonical, `1302 → 1365` boundary; inflated `5197 → 5445` and
`5281 → 5529`). One text-showing block is inserted at `1 0 0 1 72 198 Tm` and the unchanged
route trailer moves down one line to `1 0 0 1 72 169 Tm`. `startxref` moves accordingly. No
other object, no resource, no font, no page count, no decretal text, no findings, no ENTERED
line, no signature rule, no JUDGE caption, no route key.

**Confirmed: FIX02 is the only difference between the approved and the current bytes.**

The line itself is defensible legal-design work — it is the corpus convention (`wy_fel_1502-set`,
`tx_exp_acquittal-set`, the Georgia orders all carry the same preparer-voice note), and it
states on the page's face what the field map already refused off it. **That is not the point.**
The owner's condition is about the digest, not about whether the change was a good one, and
FIX02's own return says so:

> OWNER RE-REVIEW. This family is owner-pinned under OWN-ADOPT-2026-09-02-BATCH-53. The repair
> moves pinned shipping bytes, so the pins must be re-taken by the owner. Nothing in this row
> re-takes them, and nothing here grants a route, opens fulfillment, or marks the packet proven.

## 3. Disposition per verifier and per record

The governing rule for this lane: **a changed pin is never a renewed approval.** A verifier
that asserts "current bytes == approved bytes" is asserting approval currency, and it is
right to fail while the current bytes are unapproved.

Option (a) — leave the pin at the approved digest and rewrite the verifier's expectation into
an explicit consistency rule (bytes == pin AND route approved, or bytes != pin AND route
revoked) — **was attempted and abandoned**, because it could not be done without weakening
negatives. The reason is recorded in §5.

| target | state | disposition |
| --- | --- | --- |
| `scripts/verify-rcap-first-route-cohort-productization.mjs` IL `artifacts` pin | `7daaa389…` / `714832a8…` | **UNCHANGED.** Comment added recording that it is an approval pin and is failing on purpose. |
| `scripts/verify-rcap-grade-a-fulfillment-authority.mjs` `IL_EXISTING_V2_EXPECTED` | `7daaa389…` / `714832a8…` plus raster, builder and verdict pins | **UNCHANGED.** Comment added, as above. |
| `data/record-clearing/packet-specifications/IL-felony-prostitution-relief.v1.json` `approvedArtifacts` | `7daaa389…` / `714832a8…` | **UNCHANGED, and correct as it stands.** DEL-A reported these hashes as "stale versus the committed fixtures". They are *divergent* from the committed fixtures, which is the point: the field is named `approvedArtifacts`, not `currentArtifacts`, and it must name the bytes an owner approved. Refreshing it to `d4cb7659…` would silently manufacture an approval. |
| `scripts/generate-rcap-grade-a-fulfillment-authority.mjs` | pins `7daaa389…` via the specification and the owner record | **UNCHANGED.** It already fails closed correctly — see below. |
| `data/rcap-grade-a/fulfillment-authority-registry.json` IL record | `revoked: true`, route denied | **UNCHANGED and correct.** |

### The registry binds the approved bytes, not the current bytes

Worth stating precisely, because it has been described the other way round. The IL record's
`evidenceBindings.approvedArtifacts` and `evidenceBindings.rasterReceipt` both carry
`7daaa389…` / `714832a8…`. `d4cb7659…` / `ea728bba…` appear in the registry **only** under
`evidenceInputs`, the generator's census of what it read on disk — a statement of fact about
bytes, not a binding of authority.

### The generator already refuses, for the right reason

Running `node scripts/generate-rcap-grade-a-fulfillment-authority.mjs` (in the worktree, then
reverted) leaves the IL record revoked and records the refusal verbatim:

```
"routeId": "IL:felony-prostitution-relief",
"disposition": "ALREADY_REVOKED",
"currentRefusal": "First-cohort evidence refusal: data/rcap-all50/overlays/census-v1/il/
                   il-prostitution-j-vacate-set--custom-pleading/fixtures/canonical.pdf
                   no longer hashes to its approved digest"
```

The gate is `scripts/generate-rcap-grade-a-fulfillment-authority.mjs:1250-1252`: the owner pin
must equal the specification's approved artifact, and the bytes on disk must hash to it. So the
approval-currency negative is enforced by the generator, not only by the red verifiers, and it
is enforced on the path that could actually open a route. **The live route stays denied:**
`verify-rcap-il-consumer-authority.mjs` and `verify-rcap-il-delivery-binding.mjs` both pass, and
the cohort verifier still asserts `sellable=false`, `creditConsumable=false` and
`MAINTENANCE_HOLD` for this route.

## 4. What a renewed approval would require

1. **A new legal-decision record, written by the decision owner (Roger Roman)**, naming
   `d4cb765983ed2ed180a74feb1a70b7b5cc43134419b2c497746d8fd188bd2657` (7895 bytes, 3 pages) and
   `ea728bba06d2112537e99846f12d78a1c3d7f49eb8ae0f101a94291920bbf25e` (8073 bytes, 3 pages) as
   the approved shipping-artifact digests for `il-prostitution-j-vacate-set`, under a new
   `recordId`, in `data/rcap-grade-a/legal-decisions/`. `OWN-ADOPT-2026-09-02-BATCH-53` cannot be
   edited to cover them: it records what was approved on 2026-09-02, and the change it forbids is
   exactly the one that happened.
2. **A fresh post-approval change audit row** for the family, reviewed against that new record,
   replacing the row whose `sha256ApprovedAndNow` key is now false.
3. **A fresh central raster receipt on the new bytes.** The queue has one
   (run `33972727725`, job `101324362197`, bound to `d4cb7659…`/`ea728bba…`) and it correctly
   marks the approved-byte receipt (run `33574304514`) as superseded. A raster pass proves
   rendering, never legality.
4. **Only then** may a lane holding that record move the pins in the specification's
   `approvedArtifacts`, in both verifiers, and in the generator, and re-run the generator so the
   registry reinstates the record on its own history chain.

No verifier, generator or lane may take steps 1–2 on the owner's behalf, and step 4 without
step 1 is the failure this document exists to prevent.

## 5. Why option (a) was abandoned

Option (a) was implemented far enough to learn what it costs, then reverted in full. The
Illinois record is not one stale pin; it is a frozen snapshot of the whole approved-era
evidence chain, and every link has moved:

| binding | pinned (approved era) | on disk / current |
| --- | --- | --- |
| canonical + boundary bytes | `7daaa389…` / `714832a8…` | `d4cb7659…` / `ea728bba…` |
| raster receipt | run `33574304514`, job `100075268121` | run `33972727725`, job `101324362197`; the old one is `supersededReceipts[0]` |
| builder digest | `27df6b2f…` | `993d2c18…` (FIX02, then DEL-A's refactor) |
| current independent verdict | vf01 @ `31cf727c0…` | vf01 @ `d974bcdd8` |

Making the verifier green needs a "bytes moved ⇒ assert historical, not current" branch at each
of those, plus the ~10 further clauses inside `finalVerificationProblem`. Three were written and
each one passed only to expose the next. That is not making an expectation explicit; it is
building a parallel revoked-mode contract for one family, where a single mistaken carve-out
weakens a negative silently.

The decisive one is the fourth row. The current independent verdict, vf01 @ `d974bcdd8`
(`data/rcap-grade-a/packet-factory-24h/vf01/rows.json`), is `PASS_COMPLETE_INDEPENDENT` and
declares `canonicalSha256: d4cb7659…`, `boundarySha256: ea728bba…`. `d974bcdd8` descends from
`42defabe4`. So it is a technical pass **on the unapproved bytes**. Re-pinning the verdict — the
change that looks most like harmless metadata maintenance — would let an independent technical
pass on unapproved bytes satisfy a check whose whole expectation block is anchored to the owner
approval. That is precisely a changed pin acting as a renewed approval.

So the pins stay, the reds stay, and the reason is written in the two verifiers next to the
pins so the next reader does not "repair" them.

## 6. Mississippi: the same defect, recorded and stopped

Two of the three reported failures are Mississippi. They are **not** stale metadata, and the
minimal generator repair the assignment anticipated does not exist. Nothing was changed for
Mississippi; the exact defect is:

* `ms-misd-addl-set` shipping bytes moved off the owner-approved
  `7878f2c0d297bf272eb166820505996ba32976a174b8019140ee83728bf3cd3c` /
  `96c13766362702101176e205e7cea1bd39a9305fe175f703ece4e5241680a3c5` to
  `3c7588be6f1734cab76c30035cb9eb404dc6e0d78eeb9e3971415ed2cedf1399` /
  `e2b8cebcb089a20777cfb31bcd5b70340729690bf5232894e7e8adf81fcada36` at commit **`065aab4fc`**
  ("Integrate FIX08: … the two Mississippi orders no longer deliver a trailer-only page").
  No legal-decision record names the new digests. This family is in the same 2026-09-02
  50-family qualification as Illinois and carries the same re-review condition.
* The current independent verdict moved with the bytes: `VERIFIER_RETURNS.json` now selects
  **vf04 @ `a0fbceb30`** (`vf04/rows.json`), superseding vf01 @ `cd48fc14e` and the vf08
  `FAIL_REPAIR_REQUIRED` @ `aefd46f7c`. The supersession is computed correctly — `a0fbceb30`
  descends from both `cd48fc14e` and `aefd46f7c` — and the vf04 row declares
  `canonicalSha256: 3c7588be…`. So, exactly as in Illinois, the current verdict is a technical
  pass on unapproved bytes.
* **Failure 2** ("current verifier registry row has the wrong lane, base, or evidence path") is
  the verifier's own pin, `{vf01, cd48fc14e, vf01/rows.json}` at
  `scripts/verify-rcap-grade-a-fulfillment-authority.mjs` `FIRST_COHORT_EXPECTED`, and the same
  pin at `scripts/generate-rcap-grade-a-fulfillment-authority.mjs:133-139`. Re-pinning it to
  vf04 @ `a0fbceb30` would be the Illinois mistake in §5.
* **Failure 3** ("projected REVOKED/not_commercially_eligible") is the **correct** posture. The
  generator refuses both MS routes with
  `currentRefusal: "… ms-misd-addl-set--custom-pleading/fixtures/canonical.pdf no longer hashes
  to its approved digest"`. The verifier's expectation that every exact-productized route
  projects `COMPLETE_PACKET_PROVEN` / `commercially_eligible` is what is wrong for a family that
  shipped past its approval; satisfying it would mean reopening two routes on unapproved bytes.

Repairing Mississippi means an owner re-review of `3c7588be…` / `e2b8cebc…`, not an edit to a
generator input. The defect is recorded here and in a comment beside the two MS entries in the
authority verifier. **Mississippi behaviour is otherwise untouched: no MS file was modified.**

### A separate, unrelated finding: the generator `--check` failure

`node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check` fails before and after
this lane, and it is **not** an Illinois or Mississippi approval issue. Regenerating produces a
three-line diff, all of it downstream of DEL-A's commit `0fcedd773`:

* `evidenceInputs["scripts/build-census-v1-il-prostitution-j-vacate-set.mjs"]`
  `5137c074…` → `993d2c18…` (DEL-A's refactor of the IL builder);
* the `MS:non-conviction-…` clinic-demo record's provider `imageDigest`
  `sha256:fdcc2cd7…` → `sha256:4ee4332e…`, which the generator derives from
  `sha256(composer.ts ‖ renderer.ts)` — DEL-A changed one of those — plus that record's
  `history[].recordSha256`.

No record's state, revocation or eligibility changes (`completePacketProven: 2`,
`commerciallyEligible: 2`, `revoked: 3`, before and after). The regeneration was run in this
worktree to establish the above and then **reverted**: it is DEL-A's change to re-generate as
part of owning the composer edit, and this lane declined to absorb another lane's provider
identity change silently, which is the same principle §1–§5 applies to Illinois.

## 7. Positive-test authority for the current bytes

`scripts/test-rcap-il-authority-fixture.mjs` (not edited by this lane) was read in full.

* **Stays out of the committed registry: yes, provably.** Its only two `writeFileSync` calls
  target paths inside an `fs.mkdtempSync(os.tmpdir(), "rcap-il-authority-")` directory. It
  `chdir`s there only to load the registry and observation into process-local caches, restores
  the cwd, and in `finally` restores cwd, resets both caches and `rmSync`s the temporary tree.
  The synthetic record is `recordId: "SYNTHETIC-IL-delivery-test-only"`.
* **Binds `d4cb7659…`: no — it binds no fixture bytes at all.** The only real digest it takes
  from the repository is `sha256` of the IL specification file; `artifactValidation.artifactSha256`,
  `fixture.sha256` and `packetCompleteness.filingFormatArtifact.sha256` are digests of the
  literal strings `"artifact"`, `"fixture"` and `"filing.pdf"`, and the provider `imageDigest`
  is `sha256("synthetic-worker")`.

So it supplies an isolated, route-shaped **admitting** authority for
`IL:felony-prostitution-relief`, which is what a delivery-chain positive test needs to get past
admission, and it cannot leak into the shipped registry. It does **not** supply an authority
bound to the current shipping bytes. If Codex's chain needs the rendered artifact to reconcile
against `record.artifactValidation.artifactSha256`, that binding has to be added by the lane
that owns the file — and binding `d4cb7659…` *there* is legitimate, because a synthetic
test-only record that never reaches the registry asserts nothing about approval.

## 8. Verifier results, verbatim

Run at base `0fcedd773`, `MASTER_LIBRARY_SOURCE_DIR=/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1`.

### Before

`node scripts/verify-rcap-first-route-cohort-productization.mjs` — exit 1

```
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ 'd4cb765983ed2ed180a74feb1a70b7b5cc43134419b2c497746d8fd188bd2657'
- '7daaa389709afebccd46cdcee56b16c9888eb4ddcda2475c6c1e0b7315b9517d'

    at file:///home/user/delc-worktree/scripts/verify-rcap-first-route-cohort-productization.mjs:524:12 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: 'd4cb765983ed2ed180a74feb1a70b7b5cc43134419b2c497746d8fd188bd2657',
  expected: '7daaa389709afebccd46cdcee56b16c9888eb4ddcda2475c6c1e0b7315b9517d',
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v22.22.2
```

`node scripts/verify-rcap-grade-a-fulfillment-authority.mjs` — exit 1

```
GRADE-A FULFILLMENT AUTHORITY — 3 FAILURE(S):
  ✗ every exact productized record binds its committed specification, artifacts and receipts: IL:felony-prostitution-relief: Canonical artifact bytes, length, or page binding moved
  ✗ every exact productized record binds current independent verification to exact family and artifact inputs: MS:additional-justice-court-misdemeanor-relief-9-11-15-3: current verifier registry row has the wrong lane, base, or evidence path
  ✗ every exact productized record closes its fulfillment evidence gaps without opening a route: MS:additional-justice-court-misdemeanor-relief-9-11-15-3 projected REVOKED/not_commercially_eligible
```

`node scripts/verify-rcap-il-consumer-authority.mjs` — exit 0

```
Consumer authority: synthetic valid and 15 negative bindings PASS; committed registry REVOKED, allowed=false
```

`node scripts/verify-rcap-il-delivery-binding.mjs` — exit 0

```
Illinois delivery binding: exact track/family/job and consumer/sponsored denials PASS (local only)
Illinois committed registry: REVOKED; admitted=false
```

`node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check` — exit 1

```
Regeneration required — these files do not match their evidence:
  data/rcap-grade-a/fulfillment-authority-registry.json
  data/rcap-grade-a/fulfillment-observation-snapshot.json
```

`node scripts/generate-rcap-launch-graph.mjs --check` — exit 0

```
launch graph current — 262 intended-paid pathways, 0 operationally sellable
```

### After

`node scripts/verify-rcap-first-route-cohort-productization.mjs` — exit 1

```
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ 'd4cb765983ed2ed180a74feb1a70b7b5cc43134419b2c497746d8fd188bd2657'
- '7daaa389709afebccd46cdcee56b16c9888eb4ddcda2475c6c1e0b7315b9517d'

    at file:///home/user/delc-worktree/scripts/verify-rcap-first-route-cohort-productization.mjs:538:12 {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: 'd4cb765983ed2ed180a74feb1a70b7b5cc43134419b2c497746d8fd188bd2657',
  expected: '7daaa389709afebccd46cdcee56b16c9888eb4ddcda2475c6c1e0b7315b9517d',
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v22.22.2
```

`node scripts/verify-rcap-grade-a-fulfillment-authority.mjs` — exit 1

```
GRADE-A FULFILLMENT AUTHORITY — 3 FAILURE(S):
  ✗ every exact productized record binds its committed specification, artifacts and receipts: IL:felony-prostitution-relief: Canonical artifact bytes, length, or page binding moved
  ✗ every exact productized record binds current independent verification to exact family and artifact inputs: MS:additional-justice-court-misdemeanor-relief-9-11-15-3: current verifier registry row has the wrong lane, base, or evidence path
  ✗ every exact productized record closes its fulfillment evidence gaps without opening a route: MS:additional-justice-court-misdemeanor-relief-9-11-15-3 projected REVOKED/not_commercially_eligible
```

`node scripts/verify-rcap-il-consumer-authority.mjs` — exit 0

```
Consumer authority: synthetic valid and 15 negative bindings PASS; committed registry REVOKED, allowed=false
```

`node scripts/verify-rcap-il-delivery-binding.mjs` — exit 0

```
Illinois delivery binding: exact track/family/job and consumer/sponsored denials PASS (local only)
Illinois committed registry: REVOKED; admitted=false
```

`node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check` — exit 1

```
Regeneration required — these files do not match their evidence:
  data/rcap-grade-a/fulfillment-authority-registry.json
  data/rcap-grade-a/fulfillment-observation-snapshot.json
```

`node scripts/generate-rcap-launch-graph.mjs --check` — exit 0

```
launch graph current — 262 intended-paid pathways, 0 operationally sellable
```

### Before vs after

Byte-identical for all six commands, with one exception: the cohort verifier's stack frame
reads `…verify-rcap-first-route-cohort-productization.mjs:538:12` instead of `:524:12`, because
the explanatory comment added above the pin shifted the assertion down fourteen lines. The
assertion, the actual value, the expected value and every exit code are unchanged. Verified by
`diff` of the captured output of each command before and after, and the after-run reproduced
byte-for-byte on a second execution:

```
=== verify-rcap-first-route-cohort-productization ===
11c11
<     at file:///home/user/delc-worktree/scripts/verify-rcap-first-route-cohort-productization.mjs:524:12 {
---
>     at file:///home/user/delc-worktree/scripts/verify-rcap-first-route-cohort-productization.mjs:538:12 {
=== verify-rcap-grade-a-fulfillment-authority ===
(identical)
=== verify-rcap-il-consumer-authority ===
(identical)
=== verify-rcap-il-delivery-binding ===
(identical)
=== gen-auth-check ===
(identical)
=== gen-launch-check ===
(identical)
```

That the two failing verifiers report exactly what they reported before is the intended
outcome of disposition (b): this lane changed no pin and no assertion. The whole code change is
comment text. **`d4cb7659…` appears in the two verifiers only inside those comments, as the
digest that is NOT approved; it is pinned nowhere, and it was not added to the specification's
`approvedArtifacts` either.** The live route stays denied — both Illinois runtime verifiers
pass, printing `REVOKED, allowed=false` and `REVOKED; admitted=false`.

## 9. What this document grants

Nothing. It records a disposition. It opens no route, moves no pin, sets no price, creates no
commercial authority, and does not re-take an owner approval. The Illinois and Mississippi
routes remain REVOKED and denied, and they remain so until the decision owner names the current
bytes in a new record.
