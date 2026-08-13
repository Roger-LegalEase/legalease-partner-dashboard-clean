# D-FIX-2 — independent review — NH NHJB-2956

**Family:** `NH:nhjb-2956-support-record-request-en`
**Finding under review:** D-V3-R-001 (high)
**Reviewed:** `e6bb20c` (family bytes) on base `257bf04` (shared factory)
**Disposition: `correction_required`**

D-V3-R-001 itself is fixed. Five other defects in the same package are not, and
three of them are the same species as the finding — a record that describes
something other than the bytes on disk.

Machine-readable detail, including every digest and every acceptance condition,
is in `d-fix-2-review.json`.

## What the bytes say

**The sheet is built from the artifact.** `canonical-filled.pdf` hashes to
`1325545d…`. `contact-sheet-proof.json` records that value as both
`builtFromSha256` and `finalizedSha256`. The sheet hashes to `334d10d3…`, which
is what the proof and `rendered-artifacts.json` both record. All four manifest
paths exist and all four digests match the files. Computed independently, not
read back from the JSON.

**The captions are gone.** The right-hand panel of the sheet — object 28, drawn
at `x=431.44`, the one the caption calls "finalized fill" — invokes the same 14
`FlatWidget` appearance streams, with the same names and BBoxes, that
`canonical-filled.pdf` invokes. Every one of them paints nothing: each builds a
path and either restores without a painting operator or clips with `W n`, then
shows an empty or space-only string. No Print, Reset, Save, Clear, Submit or
navigation caption appears on the finalized artifact, on either fixture, or on
either panel. The only apparent hit anywhere is `PLEASE PRINT CLEARLY`, which is
body text the state prints on the form.

The pre-fix sheet, decoded the same way, carried 17 widgets in that panel,
three of them drawing `Clear Form`, `Top of Page` and `Instructions`. The
defect was real and it is fixed.

**Nothing binds, and that has not changed.** `bindings` and `explicitMappings`
are both empty at `257bf04` and at `e6bb20c`. No binding was added or removed.

**No active content.** No XFA, JavaScript, `/AA`, `/OpenAction`, Launch, Submit,
ImportData, URI or network action in any of the four files, in raw bytes or in
any inflated stream. `/Annots [ ]` on every page, no `/Widget` objects, no
`/AcroForm`, no orphaned widgets, no object streams.

**The re-render was inert.** The acceptance condition asked for the sheet to be
rebuilt from the artifact as it stood (`0ba50bb2…`); the implementation
re-rendered the artifact to `1325545d…` instead. All 54 objects are identical
except object 3, the `/Info` dictionary, where only `/Title` changed. No mark on
the page moved. The deviation is accepted, and noted rather than waived.

**Canaries and verifier.** D0: 149 checks. D0-v3: 43. D0-v4: 35. All pass.
`d-v4-verify-corrections.mjs NH:nhjb-2956-support-record-request-en`: 7/7.

## Is the sheet adequate evidence?

Not as visual verification. As a null control, yes — and it is worth keeping.

The two panels decode to the same 140 body-text runs in the same order. The only
difference is that the right panel additionally invokes 14 appearance streams
that draw nothing. Side by side, a reviewer sees two identical pages. The sheet
cannot show placement, fit, legibility, or that any value is visible, because no
value was written.

What it does prove is narrow and genuine: the artifact a reviewer would sign off
carries no control caption and no active content. That matters here precisely
because the pre-fix sheet proved the opposite and was believed. So keep it — but
the package must stop asserting `panelsDiffer` and `allExpectedValuesVisible` as
though they were measured, and stop telling the reviewer the sheet does not
exist. This is not enough on its own to lift
`f_independent_visual_review_required`.

## Are the verifier's assertions the right ones?

Six of the seven are. They read the bytes: paths exist, digests match, no active
content, the sheet's source digest is the artifact's, no caption on the
artifact, the manifest records the sheet on disk.

The seventh — the only NH-specific one — is circular. It asserts
`proof.panelsDiffer === true`, and `rcap-contact-sheet.mjs:159` writes that key
as a hardcoded literal. It passes for any sheet the builder emits, including one
whose panels are identical, which is the failure mode the finding was reported
against. That is `D-FIX2-R-NH-003`.

Three checks that would have caught the findings below are missing entirely:
that every digest recorded in a package names a file in that package; that
bindings plus refusals account for every census field; and that `findings.json`
and `handoff.md` agree with the artifacts present.

## Findings

| id | sev | file | defect |
|---|---|---|---|
| D-FIX2-R-NH-001 | medium | `reports/determinism.json` | Both digests are `0ba50bb2…`, the pre-fix artifact. No file in the package has that digest. The reproducibility evidence certifies a file that is gone — D-V3-R-001 moved one file over. |
| D-FIX2-R-NH-002 | medium | `contact-sheet/contact-sheet-proof.json` | `panelsDiffer: true` was never measured; the builder returns the literal, and the check that could contradict it is skipped when `expectedValues` is empty. Measured the builder's own way, the panels are *equal*. `allExpectedValuesVisible: true` over an empty set is vacuous. |
| D-FIX2-R-NH-003 | medium | `scripts/rcap-official-forms/d-v4-verify-corrections.mjs:146-149` | The one NH assertion reads that hardcoded literal back out of the JSON, so it cannot fail. |
| D-FIX2-R-NH-004 | medium | `production-field-map.json` | The 17-entry refusal ledger became `[]`. The map now says 17 fields, 0 bound, 0 refused — no reason recorded for any field. `Clear Form`, `Form Guide` and `top page` vanish from the map entirely. Coverage is unchanged; the disclosure is not. |
| D-FIX2-R-NH-005 | low | `reports/findings.json`, `handoff.md` | Both still say "no sheet is emitted" / "Contact sheet: not emitted", on the family whose sheet this fix rebuilt. |

Each carries a specific acceptance condition in the JSON.

## Limits of this review

The source binary is not in this repository — `private/` does not exist in the
worktree and no tracked PDF has the declared source digest `c8e5e9fe…`. So
`sourceSha256`, the reproducibility claim, the declared byte length and field
count, and `reports/source-drift.json` could not be checked against the source.
They are carried as unverified, not accepted.

PDF inspection used a decoder written for this review — objects located by
scanning `N G obj` spans, streams inflated with zlib, text decoded through each
font's own `ToUnicode` CMap, Form XObjects followed recursively. It uses neither
pdf-lib nor any script under review. The repository's scripts were run only for
the canaries and the correction verifier, and their results are reported as
theirs.
