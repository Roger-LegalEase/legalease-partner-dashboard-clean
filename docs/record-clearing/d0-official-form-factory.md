# D0 — the official-form factory, after F3

F3's visual review found that the official-form output was not what it claimed
to be. The defects were systemic rather than per-state, so they are fixed once,
in the shared tooling, and the seven D state sessions regenerate from that.

## What was wrong, and what now holds

### 1. Contact sheets showed nothing

The sheet embedded the filled-but-unflattened document. `embedPdf` copies a
page's content stream, and an unflattened field's value lives in its widget's
appearance stream — an annotation, not page content. Every sheet therefore
showed two identical blank pages while reporting itself review-ready, and
independent visual review was being handed an artifact that could not show the
thing it existed to show.

The sheet is now built from the **finalized participant artifact**: values
materialized into appearances, flattened into page content, sanitized. The
proof is mechanical, not asserted — `rcap-pdf-anchor-capture` gained Form
XObject recursion, so the text a flattened appearance draws is readable, and
`buildContactSheet` refuses to emit when an expected value is not visible, or
when the two panels are identical despite values being expected.

### 2. Shrink-to-fit was measured but never applied

The old renderer computed the overflow, recorded a finding, and then wrote the
value anyway at a fixed size. The finding and the defect shipped in the same
artifact.

`rcap-text-fitting` now decides, against the real widget rectangle and the
embedding font's own metrics, between three outcomes: it fits, it wraps within
a multiline widget's height, or it is **refused**. Below
`MIN_READABLE_FONT_SIZE` (6pt) the choice is between an illegible filing and no
filing, and the factory takes no filing: the field is left to a human rather
than stamped with 4pt text.

### 3. Field binding was permissive by construction

A field bound whenever its name matched any participant-ish pattern, so
protection depended on a deny pattern having been thought of first, and
anything unanticipated defaulted to writable.

`rcap-field-semantics` inverts this. Every field starts protected. Writing
requires all of: no protect rule matches; the PDF type is text or dropdown; the
name matches an allowlisted fact descriptor; the value's type matches what the
descriptor declared; any sensitive descriptor has been named for that exact
field by the caller; and an indexed charge row resolves to a charge that was
actually supplied.

Default-protected categories: money, race, arrest and disposition dates
(without an explicit mapping), agency and licensing-board blocks, court, clerk,
prosecutor and attorney fields, responsible officials, signatures,
notarization, service blocks, outside parties, unindexed charge rows, and every
non-text control.

### 4. Nothing removed active content

`rcap-active-content` reuses lane E's proven sanitizer directly — importing
`neutralizeXfa`, `stripDocumentActions`, `stripLinkAnnotations` and
`scanAnnotationActions` rather than reimplementing them, so the two lanes
cannot drift into two different ideas of what "clean" means. It adds what E's
XFA path did not need: field-level `/AA` scripts, annotation subtypes that are
active content in themselves (RichMedia, Movie, Screen, FileAttachment, 3D),
and a byte-level residue scan.

Output is refused if residue survives. E's insight is load-bearing: deleting a
catalog reference leaves the JavaScript object in the file, so the document is
**rebuilt** from its flattened pages, leaving every orphaned object behind.

### 5. A non-filing notice was advisory

Any form stating `DO NOT COMPLETE THIS FORM FOR FILING` now raises
`NonFilingHoldError` from both the AcroForm and the flat-overlay path. It is
not a flag the caller may read and ignore; it is refusal.

## Two bugs the canary and sweep found in this work

**Missing `/DA`.** Some official forms ship text fields with no default
appearance entry — Kentucky's AOC-496 among them. pdf-lib refuses to guess, and
both `setFontSize` and `updateFieldAppearances` throw, which would abort an
entire artifact over a cosmetic omission. A neutral default is supplied for
those fields only, before any value is written, because setting a font size
edits the `/DA` string and so requires one to exist. It governs how a value is
drawn, never what the value is. The presence test reads the returned value:
the getter returns `undefined` for a missing entry rather than throwing.

**A false-positive residue scan.** Compressed stream payloads are arbitrary
bytes, and arbitrary bytes contain `/JS` often enough to matter — a Kentucky
form's Flate-compressed image stream produced exactly that, and the scan
condemned a clean artifact. Active content always lives in a dictionary, so
stream payloads are blanked before matching and only object structure is
judged.

## Canary

`scripts/rcap-official-forms/d0-canary-verify.mjs` — 107 checks over four
synthesized canaries (an AcroForm petition, a flat printed form, a
JavaScript-bearing form, and a hand-assembled file carrying the XFA,
remote-goto and rich-media residue pdf-lib refuses to write) and six mutations.

Each mutation removes one fix and confirms its check goes red: a sheet built
from the unflattened artifact; shrink-to-fit at a fixed size with no readable
floor; the protect rules removed, leaving protected fields matching a fact
descriptor; sanitation skipped; the non-filing notice dropped; and the source
hash unpinned.

The canaries are synthesized rather than copied from a state package so the
factory is testable without the private source bundle, so every defect class
has a case that provably exercises it, and so a deliberately perturbed source
can test drift detection.

## For the state sessions

The shared verifier applies these invariants only to packages whose map carries
`factoryVersion: "d0-remediated-v1"`. A package built by the previous factory
stays valid under the older rules until its own state session regenerates it,
so this branch is a usable base without turning the whole corpus red first.

Importing the builder no longer runs it. The build was a top-level side effect,
so anything that imported the module — a test, a helper, an editor's language
server — rewrote the corpus on import.
