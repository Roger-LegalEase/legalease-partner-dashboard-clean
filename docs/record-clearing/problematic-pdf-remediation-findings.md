# Problematic PDF remediation — findings for independent review

This branch does not correct a PDF. It corrects what the repository *says*
about its PDFs, in both directions, and it puts real rendered evidence behind
the claim. Every asset remains held. Nothing was made sellable, public, or
ready for checkout, and nothing here approves itself.

Read this with:

- `data/rcap-all50/problematic-pdf-master-list.json` and
  `docs/record-clearing/problematic-pdf-master-list.md` — every asset, its
  lane, its exact blocker, its exact next action
- `docs/record-clearing/problematic-pdf-review-gallery.html` — the same list
  with rendered page images
- `data/rcap-all50/finalized-artifact-audit.json` — what each committed
  artifact actually is
- `data/rcap-all50/contact-sheet-visual-proof.json` — what each committed
  contact sheet actually shows

## The counts, before and after

Both columns are produced by the same canonical generator; the left one is what
`main` carries today.

| Measure | On `main` | On this branch |
| --- | ---: | ---: |
| Problematic assets | 128 | 128 |
| Active-track | 45 | 45 |
| Orphaned or optional | 44 | 44 |
| Missing binaries | 39 | 39 |
| Technical defects | 67 | 128 |
| Visual defects | 47 | 89 |
| Source or currentness defects | 117 | 117 |
| Source-identity ambiguity | 51 | 0 |
| Unfinalized rendered artifacts | not measured | 62 |
| Rendered artifacts not byte-inspectable | not measured | 62 |
| Contact sheets showing no fill | not measured | 54 |
| Protected fields populated by the factory | not measured | 0 |
| High priority | 21 | 30 |
| Problem-PDF routes still sellable | 0 | 0 |
| Problem-PDF routes still public | 0 | 0 |

Nothing got worse between those columns. The technical and visual defect counts
rise because defects that were always present were never counted, and
source-identity ambiguity falls to zero because 51 of those rows were never
real.

A note on the record: the message on commit `94492758` quotes 111 technical and
71 visual defects, and 53 unfinalized artifacts. Those were the figures before
the deduplication fix in that same commit took effect on regeneration. The
table above, and the generated artifacts, are the correct ones.

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

## What is *not* wrong

Worth stating plainly, because both were open questions:

- **The factory never wrote into a protected field.** Zero artifacts carry a
  factory-written value in a judge, clerk, prosecutor, attorney, signature,
  notarization, service or outside-party field. Sixteen artifacts do hold a
  value in a protected field, and in every case it is the form's own preprinted
  default — the factory's own binding report does not name the field. Those
  defaults survive only because the artifact was never flattened; finalizing it
  drops them. The two are recorded as different defects with different owners,
  because reporting the first when only the second is true would be a false
  alarm about clerk and judge fields.
- **No XFA and no active-content residue was found** in any committed artifact.
  This is *not* a clean verdict: the object streams described in (2) mean the
  scan cannot see into the objects it is judging, so the honest reading is
  "unproven", and that is what the master list records.
- **No problematic route is sellable or public.** Both counters are zero,
  computed from the route resolver rather than declared, and the master-list
  generator refuses to emit a list in which either is nonzero.
- **The historical California, Delaware and Maine corrections are already in
  `main`, byte-for-byte** — CR-180, CR-181, CR-409, CR-410, CR-106, Delaware
  Form 281 with its 1021IP carrier, and Maine CR-289. Nothing needed importing
  from those branches, and none of those forms appears in this register because
  they belong to the hard-forms lane and are corrected there.

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

## What this branch is asking for

1. **Independent technical and visual review** of the findings above,
   particularly the finalized-artifact audit and the contact-sheet proof, which
   are the basis for saying the lane's committed review evidence cannot be
   relied on.
2. **The source bundle, or network access to the issuing bodies.** Everything
   downstream is waiting on it. The exact list is the master list's lane B.
3. **Write-box placements for nine labels across six families.** A flat
   official form has no widgets, so every value is placed by measured
   geometry, and where the document does not express a write box the anchor
   capture asserts no coordinate — the correct refusal. Wisconsin CR-266 is
   the clearest case: zero anchors derived, four candidate labels, each a
   standalone caption whose value position is set by a printed cell the
   content stream never expresses as a rectangle. Re-running the factory
   reproduces the same refusal; what is needed is a person looking at the
   page. `data/rcap-all50/overlay-placement-evidence.json` lists all nine,
   and the one family whose binary is here is rendered with each label marked
   at its measured position. The marks are measured label positions, not
   proposed write boxes.
4. **A decision on the seven candidate track bindings.** Thirty-nine
   expected-and-absent assets are keyed by filename while the pinned
   legal-design registry keys packet components by form number, so they cannot
   currently name the route they affect. Candidate matches are proposed and
   labelled unconfirmed; they drive no status and no count.

Highest disposition available to this branch: **READY FOR INDEPENDENT PDF
REVIEW**.
