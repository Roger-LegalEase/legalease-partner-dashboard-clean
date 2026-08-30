# Build gate — `az_record_sealing_arrest_no_charges-set`

**Status: GATE CLOSED. Both sources are bound and the family is built.**

Arizona record sealing under A.R.S. § 13-911 where the participant was **arrested
and no charges were filed**. Strategy `official_pdf_fill`. Route
`obligation:track-pathway:AZ:az_record_sealing_arrest_no_charges:remedy-1-record-sealing`.

This document previously recorded a stop at step 1. That stop was correct on the
record then available and is preserved in the branch history at `70ab0178`. It is
superseded here: the corpus is mounted, both binaries are bound by exact SHA-256,
and every later step has been performed against the real bytes.

---

## What unblocked it

The predecessor's diagnosis was right in every particular. The pin, the release
and the archive were all correct; the container was the only thing wrong.
`bootstrap-private-corpus.sh` returned HTTP 403 because the session token could
not see `Roger-LegalEase/legalease-source-artifacts`, and the prescribed remedy —
`add_repo` for that repository — had been refused twice by the local permission
classifier rather than by GitHub.

That remedy succeeded this time. The repository was **not** pre-probed with
`curl`, `gh repo view` or `git ls-remote`, so the first wave's false-negative 404
was avoided again. After attaching it, the bootstrap resolved the release asset,
verified the archive digest
`a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89` and the
corpus's own governance checksums, and extracted 499 files across 51
jurisdictions. **Nothing was fetched from azcourts.gov, azleg.gov, any mirror or
any cache.** Custody remained `SOURCE_ALREADY_HELD` and `commissionAcquisition`
false throughout: nothing was acquired.

Preflight: `PACKET_BUILD_ENVIRONMENT_READY — 14/14 passed, 0 failed`.

## The sources, bound

| source | form | revision | pinned sha256 | bytes | pages | fields | state |
|---|---|---|---|---|---|---|---|
| `official-form:AOCCRSL1F-050825` | Petition to Seal Criminal Case Records | REV-2025-05-08 | `32c1e54d…de34db05` | 299,110 | 5 | 71 | **bound** |
| `official-form:AOCCRSL2F-050825` | Order Regarding Petition to Seal Criminal Case Records | REV-2025-05-08 | `436df2e1…fbca61b1` | 213,882 | 3 | 41 | **bound** |

Both bind by exact SHA-256 with the committed corpus index agreeing on digest,
byte length, page count and field count. The census re-counts the fields from the
document and fails the build if it disagrees with the index: 71 and 41, 112 in
total.

An **absence** and a **mismatch** remain different findings and neither is a
pass. `source-bind-gate.json` now records `everySourceBoundToItsOwnBytes: true`
with no refusals.

---

## What this family read that nothing else could tell it

**The situation control.** The predecessor recorded that the sibling family
measured petition `Check Box9` and took export `/2`, and that *which* export value
denotes an arrest with no charges filed "is not knowable from that record and is
exactly what this family must read for itself". It has now been read. `Check Box9`
carries three widgets, one per printed situation, each within ~2.5pt of its line:

| widget | rect y | export | printed line |
|---|---|---|---|
| 1 | 478.67 | **`/1`** | "I was arrested for a criminal offense and no charges were filed." ← **this route** |
| 2 | 436.47 | `/2` | "…dismissed or resulted in a not guilty verdict…" ← sibling |
| 3 | 376.47 | `/3` | "…a judgment of guilt was entered on…" |

The `/1` line continues **"If checked, please go to Section III."** — the form
routes this situation *past* Section II (SENTENCE COMPLIANCE) entirely. See
`reports/situation-control.json`.

**Two alternative captions.** Both documents print the criminal caption
"STATE OF ARIZONA -vs- [Defendant]" and, under the heading **"OR if no charges
were filed:"**, the alternative "In Re the Matter of: [____]". This route belongs
under the second. See `reports/caption-blank-finding.json`.

**Venue.** The petition states the rule for this situation on its own face
(page 2): file where the initial appearance was held, or — if none was held — in
the superior court of the county of arrest. That closes a question this file
previously recorded as open. It is *conditional* on a fact the platform does not
hold, and the form carries that question as its own controls (`Check Box7`,
`Check Box8`). See `local-filing-variation.json`.

---

## What is still open, and is not this family's to close

**The route is unreachable as compiled.** Re-checked against
`src/lib/rcap-engine/compiled/profiles/AZ-arizona.json` after the bind and
**unchanged**: `caseOutcomeOptions` offers `dismissed`, `acquitted`,
`convicted_other`, and none expresses an arrest that produced no charge. Binding
the bytes sharpened this rather than resolving it — the *official form*
recognises the situation as its own limb while the questionnaire does not. This
is eligibility and route identity, outside this family's owned path. See
`reports/route-reachability-finding.json`.

**The petition's caption for this route is left blank.** The field is named
`Plaintiff`, matches no descriptor, and its printed caption sits *below* the
widget so the label channel harvests nothing. `decideBinding` returns
`no_allowlisted_fact_matches` before it consults `explicitMappings`, so a caller
cannot introduce the fact — a mapping can disambiguate or block a binding, never
create one. This family did **not** widen the shared binder to reach it, and did
**not** write the name into `Defendant` instead, which is the one move that would
fill a caption and the one move that would be false. The order's copy of the same
caption *is* filled, because `DName` binds.

**Any statutory waiting period** for the no-charges-filed limb of § 13-911. The
sentence-compliance gate is disposed of by the form; the statute is behind refused
egress.

---

## What this gate does not grant

Closing it is not an approval. `generationAllowed` is false, `runtimeSelectable`
is false, and `approval-request.json` is a **request** for output-level legal
review, not a grant. No commercial route is opened, no output is approved for
participant delivery, and a rendered fixture is not a proven packet — least of all
for a route a participant cannot currently reach.
