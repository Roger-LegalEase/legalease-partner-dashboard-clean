# D1 — standard official forms, AcroForms and flat overlays

Lane D1. Partition: AL, AR, VA, AK, KY, NC, NE, VT, WI.

The canonical source bundle arrived as individual binaries from
Expungement.ai + RCAP Master Library Edition 1. Every implementation below was
built by opening the verified binary and reading it, not by trusting a
manifest.

## What each package contains

Per family, under `data/rcap-all50/overlays/production/<jurisdiction>/<family>/`:

| Artifact | What it is |
| --- | --- |
| `source-record.json` | Canonical path, sha256, byte length, observed structural class, page geometry, ownership determination, production holds |
| `field-census.json` | Every form field with type, per-widget page and rectangle, max length, multiline flag and option lists — read from the binary |
| `field-classification.json` | Nine-class classification of every censused field |
| `production-field-map.json` *or* `overlay-profile.json` | Fact bindings, unwritable fields, manual fields, and (flat only) measured anchors |
| `fixtures/canonical-filled.pdf` | The real form filled from the canonical fact set |
| `fixtures/boundary-filled.pdf` | The same form filled from the boundary fact set (long names, long addresses, three charges) |
| `fixtures/negative.json` | The assertion set: what the renderer must never write |
| `contact-sheet/blank-vs-filled.pdf` | Blank page beside filled page, built by embedding the real pages |
| `reports/` | Populated fields, protected fields, overflow/clipping findings, protected-field scan |

## The nine classes

`participant` and `deterministic` are the only two the renderer may write.
`manual` is participant-owned but not derivable from the fact set — an
election, a narrative, an SSN, counsel of record, an arresting agency's own
address. `court_or_agency`, `outside_party`, `signature`, `protected`
(notarization, service) and `prohibited` (court-use-only, scan and file-stamp
blocks) are never written, and `unused` is decorative or unnamed.

## Document ownership

Ownership is decided per document, then re-checked per field:

- **participant_completed** — petitions, motions, applications, affidavits,
  requests, stipulations, fee waivers. Full field-level gate.
- **court_issued_caption_only** — orders, judgments, decrees, notices of
  hearing. Only caption facts bind: name, date of birth, county, court, case
  and citation number. No decretal or dispositional field is ever written.
- **outside_party_completed** — the State's response to a petition. No fill.
- **instructional_no_participant_fill** — instruction sheets. Read, not filed.

## Flat PDFs

A flat PDF has no widgets, so nothing can be interrogated for geometry.
`scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs` decodes each page's content stream,
walks the text operators while tracking the text and line matrices, and
computes advances from each font's own `/Widths` array. Positions are
therefore measured from the document, not estimated.

Two anchor kinds come out of that:

- **rule_line_blank** — a run of underscores inside prose. Start and end are
  measured from glyph metrics, and the blank is named by the prose on either
  side of it ("Case No. ______", "______ DEFENDANT"). These are rendered.
- **trailing_label** / **candidateLabels** — a printed caption label. The
  label's own position is measured, but on a boxed caption the value's
  position is set by the printed cell rather than by the label. Where no rule
  line exists, the label is recorded with `writeBoxDerivable: false` and an
  explicit reason. No coordinate is asserted and nothing is rendered, because
  deriving one would mean inventing the form's cell convention.

A Type0/Identity-H subset font without a ToUnicode map decodes to glyph
indices rather than text. Those runs are marked inexact and excluded from
anchor placement rather than guessed at.

## Verification

`scripts/verify-rcap-official-forms-d1.mjs` is red when a census or map drifts
from the source record's sha256, a fact binds to an unwritable class, a
binding targets a checkbox or radio group, a court-issued order binds outside
the caption, an overlay anchor sits against a denied label, a rendered fixture
modified an unwritable field, or a family claims a fixture or contact sheet it
does not have.

The protected-field scan diffs the canonical fixture against the untouched
source. Several official forms ship with static text already sitting in a form
field — Kentucky's `Notice`, Nebraska's `fullcountystatementRIGHT` — so a
non-empty value proves nothing on its own. Only a value the renderer actually
changed can register as a violation.

## What this does not do

Source availability is not authorization. Every source-gated, currentness,
counsel and state-legal-review hold is preserved exactly as it stood before
the binaries arrived, `generation_allowed` stays `no`, every jurisdiction
stays `runtime_disabled`, and no track is promoted to terminal.

Independent visual approval is owned by F. This lane does not self-approve.
The write box's left edge on a `trailing_label` anchor is the one estimated
number in the entire set, and it is exactly what that review confirms.
