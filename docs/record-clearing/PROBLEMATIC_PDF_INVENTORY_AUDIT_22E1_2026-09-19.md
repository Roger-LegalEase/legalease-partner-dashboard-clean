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
