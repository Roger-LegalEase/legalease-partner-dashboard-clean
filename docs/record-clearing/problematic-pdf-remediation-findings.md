# PROBLEMATIC PDF AUDIT CORRECTED — SOURCE ACQUISITION REQUIRED BEFORE REMEDIATION

**New PDF families corrected: 0. Official sources acquired: 0.**

This branch did not remediate a PDF. It corrected what the repository *says*
about its PDFs — in both directions — and put real rendered evidence behind the
claim. Actual form correction begins only after authoritative source binaries
are acquired.

What was corrected here is inventory truth, evidence quality, classification,
deduplication, and fail-closed verification. All affected delivery routes remain
non-sellable and non-public, and every asset's release status is HELD.

Maximum status available to this package: **READY FOR INDEPENDENT REGISTER AND
EVIDENCE REVIEW.** No form family is ready for independent *correction* review,
because no correction occurred.

Read this with:

- `data/rcap-all50/problematic-pdf-master-list.json` and
  `docs/record-clearing/problematic-pdf-master-list.md` — every asset, its
  operational disposition, its acquisition priority, its exact blocker and its
  exact next action
- `docs/record-clearing/problematic-pdf-review-gallery.html` — the same list
  with rendered page images
- `data/rcap-all50/finalized-artifact-audit.json` — what each committed
  artifact actually is
- `data/rcap-all50/contact-sheet-visual-proof.json` — what each contact sheet
  actually shows
- `data/rcap-all50/overlay-placement-evidence.json` — the placement decisions
  awaiting a reviewer

## Impacted assets are not root causes

"128 technical defects" invites two opposite errors: read one way it says 128
things are broken and each needs its own fix; read the other it tempts someone
to shrink the number by dropping assets. Both are wrong, because two different
quantities are being confused. Every finding now names a root cause, and every
root cause declares whether fixing one upstream thing clears it everywhere.

| Dimension | Assets carrying a finding | Unique systemic causes | Unique family-specific defects |
| --- | ---: | ---: | ---: |
| Technical | 128 | 5 | 91 |
| Visual | 89 | 4 | 77 |
| Source | 117 | 2 | 34 |

**5 systemic technical causes**, not 128.
Each clears on every impacted asset the moment the affected families are
re-rendered through the current factory:

| Root cause | Impacted assets | Cleared by |
| --- | ---: | --- |
| `RC-T-FACTORY-PROVENANCE` | 62 | Re-rendering the affected families through the current official-form factory. |
| `RC-T-OBJECT-STREAMS` | 62 | Re-serializing the affected families without object streams, which the current finalizer already does. |
| `RC-T-UNFLATTENED-FIELDS` | 53 | Re-rendering through the current factory, which flattens before emitting. |
| `RC-T-VALUES-IN-APPEARANCES` | 53 | Re-rendering through the current factory, which materializes values into page content before flattening. |
| `RC-T-SOURCE-DEFAULT-IN-PROTECTED-FIELD` | 8 | Flattening the affected artifacts, which drops the default with every other unflattened widget. |

**4 systemic visual causes:**

| Root cause | Impacted assets | Cleared by |
| --- | ---: | --- |
| `RC-V-SHEET-FROM-UNFINALIZED-SOURCE` | 62 | Re-rendering the affected families and rebuilding their sheets from the finalized artifact. |
| `RC-V-SHEET-NO-VISIBILITY-PROOF` | 62 | Rebuilding the affected sheets with the current builder, which writes the proof beside the sheet. |
| `RC-V-SHEET-PANELS-IDENTICAL` | 54 | Rebuilding the affected sheets from finalized artifacts; the current builder refuses to emit a sheet whose panels match. |
| `RC-V-NO-SHEET-PRODUCED` | 27 | Rendering the affected families, which produces the sheet as part of the run. |

**2 systemic source causes:**

| Root cause | Impacted assets | Cleared by |
| --- | ---: | --- |
| `RC-S-CURRENTNESS-UNVERIFIED` | 44 | A currentness review pass against the issuing bodies' own publications. |
| `RC-S-BUNDLE-ABSENT` | 39 | Supplying the canonical source bundle, or opening access to the issuing bodies. |

The family-specific counts are the residue: 91 technical and
77 visual pieces of work that belong to one form each — its own
geometry, its own clipping, its own edition — and would survive every systemic
fix above.

## The counts, before and after

Both columns are produced by the same canonical generator; the left one is what
`main` carries today.

| Measure | On `main` | On this branch |
| --- | ---: | ---: |
| Problematic assets | 128 | 128 |
| Active-track | 45 | 45 |
| Orphaned or optional | 44 | 44 |
| Missing binaries | 39 | 39 |
| Assets carrying a technical finding | 67 | 128 |
| Assets carrying a visual finding | 47 | 89 |
| Source-identity ambiguity | 51 | 0 |
| Unfinalized rendered artifacts | not measured | 62 |
| Rendered artifacts not byte-inspectable | not measured | 62 |
| Contact sheets showing no fill | not measured | 54 |
| Protected fields populated by the factory | not measured | 0 |
| Problem-PDF routes still sellable | 0 | 0 |
| Problem-PDF routes still public | 0 | 0 |

Nothing got worse between those columns. The asset counts rise because findings
that were always present were never counted, and source-identity ambiguity falls
to zero because 51 of those rows were never real.

A note on the record: the message on commit `94492758` quotes 111 technical and
71 visual defects, and 53 unfinalized artifacts. Those were figures from before
the deduplication fix in that same commit took effect on regeneration, and
before findings carried root causes. This document and the generated artifacts
are the controlling correction; commit history is not rewritten for it.

## Every asset has one operational disposition

"Held" is a release posture, not an operational state, and using it for all 128
grouped a form whose route already delivers a complete deferral with a form
nobody can obtain.

| Disposition | Assets |
| --- | ---: |
| `official_source_required` | 53 |
| `certification_unproven` | 29 |
| `archive_candidate` | 27 |
| `orphaned` | 9 |
| `reference_only` | 8 |
| `active_track_delivery_hold` | 1 |
| `independent_review_required` | 1 |
| `optional` | 0 |
| `legal_design_hold` | 0 |
| `retire_candidate` | 0 |

`releaseStatus` is a separate axis and is HELD for all 128.

The two numbers that matter most for launch:

- **1 active-track asset blocks packet promotion** — Kentucky
  AOC-334, whose two tracks carry a `production_packet` treatment in the pinned
  legal design while their route currently resolves to guidance.
- **45 active-track assets are safely served today** by a guidance or
  exact-deferral treatment. Those two counts overlap by that one asset, which is
  not a contradiction: it is safe for the participant now *and* the single
  packet promotion this lane is holding up.

The 44 orphaned or optional assets are **not** launch blockers. No current
route depends on any of them: 27 are source-gated and never runtime-selectable,
8 are instruction or supporting-process documents, and 9 are packet forms
no active track requires and no candidate binding reaches.

**Retirement candidates: 0.** No record in this corpus states that its edition
is superseded, withdrawn or repealed — the freshness values in play are
`source_or_currentness_gate_open`, `candidate_current_source` and
`revision_confirmation_required`, none of which proves supersession. Marking any
asset for retirement on that evidence would be manufacturing a decision.

## The acquisition queue has four priorities, and one of them is a refusal

| Priority | Meaning | Assets |
| --- | --- | ---: |
| 1 | Active-track source required for an otherwise packet-capable route | 1 |
| 2 | Active-track source required before technical or visual review can begin | 39 |
| 3 | Source needed to resolve currentness or supersession for a current participant treatment | 4 |
| 4 | Orphaned, optional, historical or reference-only — `do_not_acquire_without_a_named_current_use` | 83 |

Priority 4 is a standing refusal rather than a low queue position. Retrieving an
orphaned or reference-only PDF to move a backlog number buys nothing and creates
a currentness obligation for an asset nobody reads. **44 assets are
genuinely worth acquiring**, not 83.

Every priority 1–3 row carries its jurisdiction, form, affected route,
active-track status, controlling first-party publisher, official URL, expected
revision, currently pinned hash, why the existing bytes are insufficient, the
work acquisition unlocks, and whether the participant is already safely served.

## What was wrong, and which way

### 1. The register was inventing defects

Sixty-four assets carried a `source_identity_ambiguous` defect reading "the
observed structural class (acroform) disagrees with the declared class
(acroform_pdf)". Those are two vocabularies' names for one thing. The canonical
bundle manifest says `acroform_pdf`; the inspector that opens the binary says
`acroform`; both say `flat_pdf`. The builder compared them with `===`.

Every AcroForm in the corpus failed that comparison and every flat PDF passed
it. There was not a single genuine structural disagreement. Source identity was
the register's largest defect class, and most of it was the comparator talking
to itself.

Both spellings now fold onto one token, in a module the builder, the D1
verifier and the register share.

### 2. The register was missing the defect that matters most

Lane D1 commits three artifacts per family — a canonical fixture, a boundary
fixture, and a blank-versus-filled contact sheet. The factory's contract is
that each is the *finalized* participant artifact: values materialized into
page content, form flattened, active content stripped, serialized without
object streams so the residue scan can see into it, stamped with the factory's
producer string.

Nothing had ever checked the committed bytes against that contract. They do not
meet it. Of the artifacts in this clone:

- **none** carries the current factory's producer stamp; the fixtures still
  carry the source document's own `Creator` and `Title`, so `setCreator` and
  `setTitle` never ran on them
- **none** is serialized without object streams, so the repository's own
  active-content residue scan cannot give a clean verdict on any of them —
  the scanner explicitly refuses to, and the finalizer explicitly refuses to
  emit such a file
- most of the fixtures still carry their full live AcroForm field set, so they
  were never flattened
- in most fixtures the participant values exist **only inside unflattened
  widget appearances**, which is to say nowhere on the page

These are the pre-remediation factory's output. The factory itself was fixed —
the D0 remediation is in `main` byte-for-byte — but the artifacts it had
already written were never regenerated, because regenerating them requires the
source binaries, and those are not here (see *What is blocked*).

### 3. The contact sheets show nothing, and said they showed something

This follows from (2) and is the participant-facing half of it. `buildContactSheet`
embeds page *content*. An unflattened field's value lives in its widget's
appearance stream, which is an annotation, not page content. So a sheet built
from an unflattened fixture copies the blank form twice.

The contact-sheet module's own header describes this exact defect as fixed, and
it is — the current builder proves its filled panel contains the expected
values and refuses to write a sheet whose panels match. **No committed sheet
carries that proof file.** Every one of them predates the check.

They were rendered and measured. **Fifty-four of the sixty-two are, to the
pixel, the same form twice.** The eight that do show a fill are the
flat-overlay families, where the factory draws text onto the page rather than
into a widget, so the values are genuinely there.

The measurement is calibrated, not asserted. Each multi-page sheet is also
measured against a comparison whose answer is known in advance — page one's
blank panel against page two's — and those known-different pairs land between
22% and 46% of pixels differing while the identical panels land between 0% and
0.06%. Three orders of magnitude, across 54 controls. Eight single-page sheets
have no control of their own and rest on that corpus-wide calibration;
`knownDifferentControl: null` marks them in the proof file.

`docs/record-clearing/pdf-visual-evidence/` holds one rendered sheet per
jurisdiction so this can be seen rather than taken on trust.

Meanwhile `implementation-index.json` records `contactSheet: true` for those
families, and the register treated a *missing* sheet as the stale-evidence
defect. The families with a sheet were the misleading ones.

### 4. Two Spanish fixtures are empty

`NC:aoc-cr-287-form-es` and `NC:aoc-cr-288-form-es` produce a canonical fixture
with no form fields and no participant values anywhere — not in page content,
not in widget appearances. The Spanish editions of these petitions are flat
PDFs with no anchors bound, so the fixture is a copy of the blank form. Their
English counterparts at least carry values, unflattened. That is an
English/Spanish parity defect in rendered output and is recorded as one.

The route-level bilingual treatment is a separate question and is unaffected:
`verify-rcap-terminalization-treatments.mjs` passes, and no route in this lane
is sellable or public in either language.

## What is *not* wrong — stated exactly, and no further

Each of these is a bounded observation. None of them is "proven absent", and
they must not be quoted as if they were.

**FIELD SEMANTICS.** No evidence that the factory wrote participant values into
protected court fields. Zero artifacts carry a value in a judge, clerk,
prosecutor, attorney, signature, notarization, service or outside-party field
that the factory's own binding report names. Sixteen artifacts do hold a value
in a protected field; in every case it is the form's own preprinted default,
which the binding report does not name. **Preprinted defaults are not
participant writes.** They survive only because the artifact was never
flattened, and finalizing it drops them.

**XFA.** None detected in the inspected committed artifacts. This covers the
artifacts in this clone and says nothing about a source binary that is not here.

**ACTIVE CONTENT.** No active content observed by the current scan. Cleanliness
remains **unproven** wherever object streams prevent complete inspection, which
is every one of the 62 committed artifacts: the repository's own scanner
explicitly refuses to give a clean verdict on a file whose object streams it
cannot see into, and the master list records the verdict as unprovable rather
than clean. "Not observed" is not "absent".

**CONTACT SHEETS.** 54 of 62 current pairs are materially identical and cannot
support visual approval. The remaining 8 show a difference and are the
flat-overlay families, where the factory draws onto the page rather than into a
widget.

**ROUTES.** No problematic route is sellable or public. Both counters are zero,
computed from the route resolver rather than declared, and the master-list
generator refuses to emit a list in which either is nonzero.

**HISTORICAL CORRECTIONS.** The California, Delaware and Maine corrections are
already in `main`, byte-for-byte — CR-180, CR-181, CR-409, CR-410, CR-106,
Delaware Form 281 with its 1021IP carrier, and Maine CR-289. Nothing needed
importing, and none of those forms appears in this register because they belong
to the hard-forms lane and are corrected there.

## What is blocked, and why nothing here fixes it

Every remaining correction in this lane is a re-render, and a re-render needs
the verified source binary.

**Those binaries are not in this clone.** The Master Library bundle the D1
builder reads (`RCAP_BUNDLE_EXTRACT`) is absent, and so is
`private/Nationwide Record Clearing/`. Of 113 distinct pinned source hashes,
exactly one binary is present anywhere in the repository: Wisconsin CR-266, at
`data/rcap-codex/remaining-tracks/source-receipts/wi-cr-266.pdf`. That one is
the master list's only lane A row, and its blocker is a placement decision
rather than a render — see item 3 below.

**They cannot be fetched.** Outbound HTTPS to state judiciary hosts is refused
by policy at the proxy — `www.nccourts.gov` and `courts.vermont.gov` both
answer 403 to CONNECT. No official source can be acquired from this session, so
no currentness question can be settled either.

That is why the master list has one lane A row out of 128. It is not that the
defects are unclear; it is that the one input every correction needs is
unavailable, and manufacturing it is precisely what must not happen.

## Wisconsin CR-266: the question, not an answer

CR-266 is the only asset whose verified binary is in this clone, and it is
recorded as `independent_review_required` rather than as a source or overlay
item, because bytes are not what it is missing.

The committed evidence says three things: **zero writable anchors were derived**;
**four relevant labels exist** (Date of Birth, Case No., Name Printed or Typed,
Address); and **the document expresses no corresponding write boxes** — each
label is a standalone caption whose value position is set by a printed cell the
content stream never expresses as a rectangle. Re-running the factory reproduces
the same refusal, which is the correct refusal: guessing a rectangle on a court
filing is how a participant's name lands in a clerk's box.

`docs/record-clearing/pdf-visual-evidence/WI-cr-266-form-en-placement-page-01.png`
renders the official form with each of the four labels marked at its **measured**
position. No coordinate is proposed and no participant field is invented.

The precise question the evidence exposes, recorded verbatim on the row:

> Where does the participant value belong relative to each measured label
> position — and, because the form's own footer states that it *shall not be
> modified* and *may be supplemented with additional material*, does a value
> belong on the form at all, or on a supplement?

That second half is a legal-design question, not a geometry one, and this lane
does not answer it.

## What this branch is asking for

1. **Independent review of the register and the evidence** — particularly the
   finalized-artifact audit and the contact-sheet proof, which are the basis for
   saying the lane's committed review evidence cannot be relied on. This is a
   review of the audit, not of any corrected form; no form was corrected.
2. **Kentucky AOC-334 first.** It is the single Priority 1 item and the single
   active-track asset blocking packet promotion. Everything else in the
   acquisition queue can wait behind it.
3. **The source bundle, or network access to the issuing bodies**, for the 43
   Priority 2 and 4 Priority 3 items. The 83 Priority 4 items are marked
   `do_not_acquire_without_a_named_current_use` and should not be fetched.
4. **Write-box placements for nine labels across six families**, listed in
   `data/rcap-all50/overlay-placement-evidence.json`. Only Wisconsin's binary is
   here, so only its form could be rendered; the marks on it are measured label
   positions, not proposed write boxes. For CR-266 the question includes whether
   a value belongs on the form at all, given its "shall not be modified" footer.
5. **A decision on the seven candidate track bindings.** Thirty-nine
   expected-and-absent assets are keyed by filename while the pinned
   legal-design registry keys packet components by form number, so they cannot
   name the route they affect. Candidates are labelled unconfirmed and drive no
   disposition, priority or count.

Maximum status available to this package: **READY FOR INDEPENDENT REGISTER AND
EVIDENCE REVIEW.** Not "ready for correction review" — there is no correction to
review. Not approved, sellable, public, packet-ready or ready for checkout.
