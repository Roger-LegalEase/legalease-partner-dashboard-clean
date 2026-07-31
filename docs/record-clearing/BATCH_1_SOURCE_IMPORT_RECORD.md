# Batch 1 source import — 31 July 2026

Package: `LegalEase_Missing_Forms_Batch_1_Repo_Ready_v2`
Imported into: `private/Nationwide Record Clearing/` (gitignored, untracked)
Branch: `fix/platform-document-delivery-core`

The source files themselves are **not** in version control and must not be. This
record, the scope decision below, and the regenerated registries are.

## Verification before import

`sha256sum -c SHA256SUMS.txt` — **107 of 107 OK, 0 failures.**

## What was imported

| | Files |
|---|---|
| Newly imported | 93 |
| Exact duplicates already present, skipped | 8 |
| Same-name/different-content conflicts | 0 |

By treatment: **36 form_candidate**, **32 source_gated**, **25 reference_only**.

By jurisdiction: CO 30, AR 22, CA 15, FL 9, AK 5, AZ 5, CT 5, AL 4, DE 4, ID 2
(before duplicate removal; see `batch-1-source-gap-report.json` for the applied
counts).

Nothing was overwritten. The import refuses to decide which revision controls: a
filename collision is resolved by hash, identical content is recorded as an
existing duplicate and skipped, and differing content would have been preserved
side by side and reported. No collision of the second kind occurred.

## Treatment, and why it is preserved on disk as well as in the registry

The package separates three tiers and warns against flattening them. They are
kept as subdirectories under each jurisdiction folder *and* carried into the
source-artifact registry as `sourceTreatment` and `runtimeEligibility`.

| Tier | `sourceTreatment` | Runtime eligibility |
|---|---|---|
| `forms/` | `form_candidate` | Ineligible pending source, legal-output, technical and visual approval |
| `reference-only/` | `reference_only` | **Never** selectable as a participant filing artifact |
| `source-gated/` | `source_gated` | Ineligible until the stated source or legal-output gate passes |

**Presence in the source library is not runtime approval.** A form candidate is
a candidate, not an approved output.

## Library folder names

Two package folders do not match the existing library folder names. Files were
merged into the **existing** folders; the library was not renamed as part of
this import.

| Package | Existing library folder |
|---|---|
| `LegalEase Arkansas` | `LegalEase Arkanasa` (long-standing typo) |
| `LegalEase California` | `LegalEase California ` (trailing space) |

Both are worth correcting, but renaming a source folder is a separate change
with its own registry consequences and is not folded into a source import.

## Local geography preserved

Two Florida packets are local and are recorded as `local_restricted`, both
`source_gated`:

- `FL-4th-Judicial-Circuit-Duval-County__seal-or-expunge-packet__source-2025.pdf`
- `FL-7th-Judicial-Circuit-St-Johns-County__seal-and-or-expunge-procedure-and-forms__source-2025-04.pdf`

Neither is statewide and neither may be presented as such. No county, circuit,
district or local packet was marked statewide by this import.

## Batch 1 form-scope decision

Recorded at `docs/record-clearing/BATCH_1_FORM_SCOPE_DECISION.md`. For Batch 1
only, a form absent from the supplied source set is not an outstanding
form-acquisition requirement. **47** absence-based entries across CO (39), FL
(6), DE (1) and ID (1) are closed on that basis.

Closing them does not make any supplied file current, statewide or approved, and
creates no new blocker.

## What this import does not do

It does not resolve governing-mechanism questions, route existence, unresolved
output strategies, unresolved venue or geography, source currency for
source-gated files, final legal-output approval, technical mapping, or visual
approval.

It does not change any relief-track decision or output strategy. A file existing
is not counsel deciding.

No track is enabled. All imported tracks remain `runtime_disabled`, tracks
deferred under `legal_research_required` remain absent from runtime resolution
and unreachable, 0 tracks are `packet_ready`, and the launch gate stays red.

## Batch 2 and Batch 3

Batch 2 and Batch 3 legal reviews and source collection are still in progress.
The nationwide packet library is **not** complete, the Batch 1 absence rule does
not apply to them, and their source expectations are not merged into this
import. The 20 non-Batch-1 missing artifacts in the registry are untouched.
