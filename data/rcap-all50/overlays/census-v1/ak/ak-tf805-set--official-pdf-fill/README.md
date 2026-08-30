# ak-tf805-set — official_pdf_fill (ROUTE OBLIGATION CENSUS V1)

**Route:** `obligation:track-only:AK:ak-tf805` — Name-Only Removal From The Public
Index, Alaska Court System form TF-805 (5/25), Administrative Rule 40(b) or (c).

## Outcome: blocked at the source gate

This family did not get built. The build is ordered, and step 1 is a gate: verify
the official binary against the corpus index before measuring anything off it.
That gate failed closed.

The corpus index names AK TF-805 at

    sha256     96306d64eda397e25094f92c3d67a642372b82cba12f97c6666e5500136e8f54
    byteLength 93899
    pages      2
    acroFields 17

and the binary is not on disk. Its corpus root, `private/source-imports/…`, is
git-ignored, so a fresh clone never had it. That was confirmed independently by
hashing all 8,647 files in the working tree: nothing matches that digest and
nothing has that byte length. The repository's own
`operational-corpus-precondition.mjs` agrees, returning `operational_corpus_absent`.

Acquisition was not attempted. This environment refuses egress to court hosts and
the task forbids it.

## Why the build stopped rather than continuing on inherited data

An existing production overlay for `tf-805-form-en` holds real measurements taken
first-hand from a binary at that same SHA-256, and this lane was told to reuse
them. They are recorded in `inherited-measurements.json`, with the hashes of the
files they came from. The custody chain is intact.

But reuse is not measurement, and it does not reach the steps that matter most.
Steps 6 through 8 — render, verify the rendered bytes, raster and review — all
need the base document. Without them there is no artifact, so
`ARTIFACT_REVIEW_REQUIRED` cannot be discharged at all, and an output approval
would be an approval of nothing.

Two substitutions were available and both were refused:

- **Deriving write boxes from label positions.** This is the exact failure the
  task names and that `scripts/lib/pdf-stroked-boxes.mjs` was written to stop —
  a detector that scanned only `re` operators, tracked no CTM, and put a mark in
  the margin. That module was read. It is the right detector; it just needs a
  content stream this lane does not have.
- **Treating the prior lane's filled fixtures as a source.** A filled PDF carries
  the original page content, but it does not hash to the official binary. Using
  one would launder a prior lane's output into this lane's source of truth —
  the same class of substitution `operational-corpus-precondition.mjs` refuses
  by name.

## Files

| File | What it is |
|---|---|
| `source-verification.json` | The step-1 gate verdict, written from bytes on disk by the script below. |
| `inherited-measurements.json` | The production lane's geometry and classification, marked inherited, not re-measured. |
| `local-variation.json` | Filing, fee, venue, verification and delivery variations, with gaps named rather than guessed. |
| `product-wiring.json` | A wiring specification that is explicitly not installed and grants no authority. |
| `build-record.json` | Step-by-step status for all 8 steps and all 5 work types. |

## What this grants

Nothing. No commercial route is opened, no fulfillment record exists, no packet is
marked proven, and the track is still absent from compiled runtime. Output legal
approval is **requested, not granted** — this lane cannot grant it.

## Unblocking

```
# mount the Master Library, or point at a checkout that has it
export OFFICIAL_FORMS_SOURCE_DIR=/path/to/Expungement_AI_RCAP_Master_Library_Edition_1
node scripts/rcap-census-v1-ak-tf805-set-verify.mjs   # must print PROCEED
```

Steps 2–8 can run once that prints `PROCEED`. The inherited coordinates may then
seed the census-v1 map, but only after the verified digest matches the one the
inherited census declares.

## One finding worth carrying forward

`reports/protected-fields.json` in the production overlay understates the
protected set by two fields. The typed binder refuses `certDate` and `emailCB` as
`protected_category` / `service_block`, and the production fixtures correctly
wrote neither — the service block was left entirely blank. But
`field-classification.json` labels `certDate` *deterministic* and `emailCB`
*participant*, and neither appears in `unwritableFields`.

Nothing is wrong in the production artifacts; the fail-closed binder held. The
risk is for a later lane that seeds a write set from class labels rather than
from `bindingRefusals` — it could write a service date and a service-method
checkbox into a certificate of service before service happens. Both fields are
carried here marked `service_block`, so this record does not repeat the omission.
The production overlay was not modified; this lane does not own it.
