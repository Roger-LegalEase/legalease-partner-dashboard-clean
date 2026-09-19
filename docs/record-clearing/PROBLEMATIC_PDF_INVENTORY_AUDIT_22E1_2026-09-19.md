# 22E-1 — the problematic-PDF arithmetic is not an arithmetic error

`verify-rcap-problematic-pdf-remediation` fails 26 times across two checks: 25
register assets missing from the master list, and
`retired 40 + problematic 96 + platform_ready 5 + launch_safely_terminal 12 = 153, not the 128 assets the corpus contains`.

## Classification

**`CORPUS_GATED_DATA_STALENESS`** — not a verifier defect, and **not closeable
today**. Correcting my own earlier call: I told the ledger 22 was "plain
engineering" that could move without waiting on anything. 22E-1 cannot. It is
blocked on a mounted source corpus, the same class of external dependency as
132B, not on an owner decision.

## Both failures are one event

Measured by stable asset key (`jurisdiction|formNumber|sha256`):

| | |
|---|---|
| Register records | **113** = 96 problematic + 12 launch_safely_terminal + 5 platform_ready |
| Register self-consistency | **holds** — the per-record membership check passes |
| Master list rows | **88** |
| Register-only (missing from master) | **25**, all `problematic` |
| Master-only (absent from the register) | **0** — master is a strict subset |
| Intersection | 88 |

All 25 are Colorado JDF assets: JDF-416, 417, 418, 419, 435, 477, 478, 491,
611, 612, 613, 614, 615, 640, 641, 642, 680, 681, 682, 683, 686, 2363, 2370,
2371, 2374.

All 25 carry `binaryPresent: true`. **That is the register's historical
acquisition record, not a fresh inspection of the bytes.** It supports the claim
that these are real acquired assets rather than register-only phantoms; it does
**not** stand in for the mounted-corpus inspection that produces field counts,
XFA status, structural class and contact-sheet evidence. Those are exactly what
the master-list rows still need.

**And 153 − 25 = 128.** One event — the 25-asset expansion — explains both
failures: the master list does not cover those 25, and the denominator literal
predates them. Nothing measured here shows any asset being **counted twice**;
the register's per-record membership check passes and no record sits in two
categories.

## The corpus really did grow, on record

The register's history holds the invariant exactly until one commit:

```
a3dcb3a6c 2026-09-16  records=113 CO=25 retired=40 sum=153
b0d951080 2026-08-23  records= 88 CO= 0 retired=40 sum=128
0980fcb55 2026-08-22  records= 86 CO= 0 retired=42 sum=128
…                     records= 86 CO= 0 retired=42 sum=128
```

128 survived a retirement reclassification — two assets moved from retired into
records, 86+42 → 88+40 — which is what the denominator exists to catch. Then
`a3dcb3a6c` (*"Regenerate the problematic-PDF register … after the Colorado
reclassification"*) added 25 assets, and the corpus became 153.

So `DENOMINATOR = 128`, a hard-coded literal in the verifier, was a **true**
statement about the corpus until 2026-09-16 and is now stale by exactly that
event. The register's totals are correct; nothing about them should be adjusted
to reach 128.

## Why the master list cannot be brought current here

`data/rcap-all50/problematic-pdf-master-list.json` is generated, and it declares
`derivedFrom.register` — the same register that now holds 113 records — while
carrying `totals.assetsTotal: 88`. It is stale against its own declared source.

Rerunning the generator refuses:

```
FAIL problematic PDF master list — refusing to write the master list without the
authorized source corpus mounted; run with OFFICIAL_FORMS_SOURCE_DIR set
```

That refusal is correct. A master-list row carries per-asset corpus facts —
`structuralClass`, `interactiveFieldCount`, `xfaPresentInSource`,
`sourceBinaryPresentInClone`, `sourceBinaryPathInClone`, contact-sheet evidence
— which cannot be derived from the register and must not be invented.

Under `--check` the generator passes, reporting
`source_validation_mode=committed_promotion_proof`: with no corpus root present
it validates the committed list against the promotion proof rather than
rederiving. `scripts/rcap-official-forms/rcap-source-validation-mode.mjs` is the
repository's shared model for this, and the whole lane already uses it.

**That passing validation must not be read as current coverage.** It establishes
that the committed list agrees with the proof it was derived from. It cannot
establish that the list includes the 25 additions, and the set comparison above
proves it does not.

**`OFFICIAL_FORMS_SOURCE_DIR` is unset here, and it appears nowhere in
`.github/workflows/rcap-all50-handoff.yml`.** So the corpus is mounted neither in
this worktree nor in CI, and the master list cannot be rederived in either place.

## Exact source required — TERMINAL EXTERNAL DEPENDENCY

Measured 2026-09-19. `rcap-source-validation-mode.mjs` looks for the corpus at
exactly three roots, in this order:

1. `$OFFICIAL_FORMS_SOURCE_DIR` — **unset**
2. `private/source-imports` — **absent**
3. `private/Nationwide Record Clearing` — **absent**

None is present here, and `OFFICIAL_FORMS_SOURCE_DIR` appears nowhere in
`.github/workflows/rcap-all50-handoff.yml`, so CI cannot rederive it either.

**The Colorado PDFs under `tmp/official-pdf-shadow-batch/all50` are not the
authoritative bytes.** Checked by digest against the register's own
`sourceSha256` for all 25 CO assets: **0 of 33 sample files match any registered
digest.** Deriving master-list rows from them would fabricate the very corpus
facts — structural class, interactive field count, XFA status, contact-sheet
evidence — that the generator refuses to invent.

To close 22E-1, the authorized source corpus must be mounted with the bytes the
register already names by digest. Then: run the canonical generator, let it
derive the 25 rows and the denominator from those bytes, and run the
problematic-PDF verifier. No part of this can be done from the repository alone.

### Correction, same day — "one of the three roots" is wrong

The sentence above originally read *"one of the three roots above must be
mounted"*. Measured against `rcap-source-validation-mode.mjs`, that is not true,
and acting on it would make the repository worse rather than better.

**The reviewed sources span two separate packages, and both must be present.**
`pdf-promotion-source-resolution.json` carries 52 rows, 46 of them with a
`resolvedPath`. Those 46 split:

| Package | Reviewed sources |
|---|---|
| `private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1` | 28 |
| `private/Nationwide Record Clearing` | 18 |

`sourceValidationMode()` returns `mounted_corpus` only when **every** one of the
46 resolves under a present root. The three roots are not interchangeable mount
points; the function says so in terms, and each source exists in its declared
package only.

Probed directly, this worktree:

```
no root mounted             mode=committed_promotion_proof  missing=0
explicit root, empty dir    mode=partial_or_invalid_source_mount  missing=46
```

**A partial mount is worse than no mount.** If a root is materialized and the
reviewed set is incomplete, the mode becomes `partial_or_invalid_source_mount`,
which never falls back to proof mode — by design, because a half-mounted corpus
is exactly where a silent demotion would look like a finding. So mounting one
package would turn the currently-passing `--check` into a hard failure, and
would do the same to every other consumer of this shared contract.

### The recovery kit does not close it

Kit `db8a02db11f3951dfffe34fa443d444d53ab4e09bce25767960905396a54f6f1`, staged by
`scripts/rcap-corpus/stage-nationwide-recovery-pool.mjs`. Measured by hashing the
kit's content-addressed pool directly rather than reading
`POOL_INDEX.json` — a filename that is its own hash is an assertion, not a
verification:

- 876 pool files, 876 distinct digests;
- **all 25 Colorado register digests are present** — the assets are recoverable;
- **all 46 reviewed-source digests are present** — the bytes exist.

And it still does not close 22E-1, for two independent reasons:

1. the kit restores **513 of the 583** files in the Nationwide restore manifest.
   70 are absent, 55 of them PDFs — including CO JDF 418, 477, 478, 611, 612 and
   615 at digests the manifest names. The custody is honestly declared
   `PARTIAL_NATIONWIDE_RECOVERY_POOL`, `completeOperationalCorpus: false`;
2. it restores **none** of the Master Library package, which holds 28 of the 46
   reviewed sources. The kit's 18 Nationwide reviewed sources are in the restore
   manifest; the other 28 are not in it at all.

Staging it writes to `private/source-imports/Nationwide_Recovery_Pool_2026-09-02`,
which materializes `private/source-imports` — the Master Library's own declared
root — without the Master Library in it. Those 28 sources then count as
`missing` rather than `notMaterialized`, and the mode drops to
`partial_or_invalid_source_mount`. **Do not stage the pool in this worktree to
try to close 22E-1.** That the pool holds matching bytes is not the same fact as
a mounted package: `locateExpectedSource` resolves by basename under a declared
root, and a content-addressed pool has no basenames to find.

So the external dependency is sharper than first stated: **both** the Edition 1
Master Library and a complete 583-file Nationwide corpus, each at its declared
path. Neither is here, and `OFFICIAL_FORMS_SOURCE_DIR` still appears nowhere in
`.github/workflows/rcap-all50-handoff.yml`.

## Why the red should stay

The remediation verifier does not consult the shared source-validation mode, so
it asserts a corpus-derived relationship unconditionally. It would be easy to
make it green by teaching it to skip when the corpus is unmounted.

**That would be asking less, not proving more.** The master list genuinely is
stale against the register; 25 real assets are in the inventory and absent from
the list that is supposed to enumerate it. The check is reporting a true
inventory gap. AGENTS.md: *"A suite that is green because its checks stopped
asking proves nothing."*

The terminal fix is a corpus-mounted rederivation, not a verifier change.

## Answers to the set questions, since they were asked

- **Mutually exclusive?** Yes, and already enforced per record — a record in both
  `platformReady` and `launchSafelyTerminal` fails, so the total alone cannot
  hide a double count.
- **Do retired assets stay in the denominator?** Yes. 40 retired + 113 records =
  the corpus. Retirement moves an asset between categories; it does not leave.
- **Can one logical form produce several registered assets?** **Yes.** 113
  records resolve to 98 distinct `jurisdiction|formNumber` pairs, so 15 records
  are further assets of a form already present. The `sha256`-bearing identity is
  the correct stable key and `jurisdiction|formNumber` is not.
- **Register-only assets:** 25, enumerated above. **Corpus-only:** none
  detectable without the corpus mounted, which is the gate itself.

## What must not be done

- Do not adjust any register total to reach 128. The totals are right; the
  literal is stale.
- Do not re-pin `DENOMINATOR` to 153 as a new literal. It would be true today and
  stale at the next authorized reclassification, which is how it broke the first
  time.
- Do not derive the denominator from the register's own totals. The check exists
  to cross-examine those totals; sourcing it from them makes it vacuous.
- Do not hand-author the 25 missing master rows. Each needs per-asset corpus
  facts that only the mounted corpus supplies.
- Do not make the verifier skip when the corpus is unmounted. The staleness is
  real and the red is accurate.

## Gate

Diagnosis only; no byte moved. The master list is **not** a worker-image input;
the register **is**, and it did not move. `comparedInputs: 30`,
`changedPaths: []`, `rebuildRequired: false`.
