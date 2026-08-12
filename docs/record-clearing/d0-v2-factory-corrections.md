# D0-v2 — three corrections the independent review found in the D0 factory

The D wave's independent review returned 61 families for correction. 56 of the
114 corrections behind them trace to three defects in this shared tooling, so
they are fixed once here and the lanes re-render from it.

All three were defects in the previous D0 remediation. Each is fixed with a
canary that goes red when the fix is removed, and Defect A is additionally
audited against all 252 source PDFs in the D packs.

## Defect A — flattening printed what the form does not print

`sanitizeAndFlatten` called `form.flatten()` unconditionally. pdf-lib draws
every widget's appearance stream into page content, so flattening promoted
helper widgets and control captions into permanent ink on court filings:
Arizona's AOCCRSL1F printed `Reset`, Kentucky's AOC-496.5 printed
`NOTICE: Not all bowsers handle fillable PDFs the same.`, and eight more forms
across five states printed `Print`, `Reset Form` or `Clear Form`.

Nothing in `scripts/rcap-official-forms/` read an annotation's `/F` flags.

`readAnnotationFlags` now applies the test a viewer applies when it prints: an
annotation is part of the filed appearance only if the Print bit (4) is set and
neither Hidden (2) nor NoView (32) is. An absent `/F` entry means zero, which
means it does not print — and that is exactly how official forms mark their
Reset and Clear Form buttons.

`suppressNonPrintingWidgets` removes those widgets before the flatten, after
`updateFieldAppearances` so no printing field loses a freshly generated
appearance. A field whose widgets are all non-printing goes; a field with a mix
keeps the copies that print. `stripNonPrintingAnnotations` then applies the same
test to whatever annotations survive flattening.

**The rule was chosen from the corpus, not from the spec.** Across the 252
source PDFs: 99.4% of text widgets set Print, and no document leaves all of its
text widgets unset — so honoring Print can never blank a whole form. Only 6.3%
of buttons set it, which is precisely the leak.

A value written into a widget the form marks as non-printing is a genuine
collision — the value would not appear on a printed copy either way — so it is
reported as a `written_value_in_non_printing_widget` refusal rather than
disappearing quietly. No form in the corpus produces one.

### Audited against the real corpus

`d0-corpus-flag-audit.mjs` flattens every source form both ways and diffs the
text runs. Comparing the untouched source against the flattened output would
report false differences, because flattening draws field values into page
content and regroups lines around them; comparing the two flattened outputs
isolates exactly what the flag test changed.

> 36 forms carry a non-printing widget. **535 runs removed, every one inside a
> widget the source marks as not printing. 0 runs added. 0 unexplained.**

The existing canary's finalized artifacts are byte-identical to their D0
versions, which is the same claim at the artifact level: this removed nothing
legitimate.

## Defect B — the contact sheet carried the blank form's scripts

`buildContactSheet` embedded the raw blank bytes. `embedPdf` reaches into the
source document for what a page references, so the blank form's `/AA`
additional-action dictionaries and `/JS` scripts came across into the sheet —
unreachable from the page tree, but present in the bytes. 20 of the 44 sheets
the reviewers opened carried them. Seven of the 252 source PDFs ship this.

Both panels are now sanitized before they are embedded, and the composed sheet
is sanitized and proven clean before it is returned. Panels are not flattened
again: the finalized artifact already is, and flattening the blank one would
materialize the empty field appearances the left-hand panel exists to show.

The proof records the scan of the bytes that were actually embedded. Without
that, the panel step could be deleted and nothing would notice — rebuilding the
composed sheet cleans it either way. That gap was real: the first version of
this canary passed with panel sanitation removed.

## Defect C — `inspectable: false` was being read as a pass

`scanBytesForActiveContent` reported `{ hits: [], inspectable: false }` for a
file saved with object streams, because it cannot see inside them. Callers read
the empty `hits` array and treated it as clean. Every one of the 136 contact
sheets passed that way, and the residue was really there: re-saved without
object streams, the same sheet reports `document_javascript`,
`field_javascript`, `additional_actions`, `uri_action`.

Cleanliness is now a positive claim. The scan carries `clean` and a `verdict` of
`clean` / `residue_found` / `uninspectable`, and `assertInspectableAndClean` is
the single gate every emitted artifact passes through. Both failure modes raise
a typed error — `UninspectableArtifactError` or `ActiveContentResidueError` —
each naming the artifact and what has to happen to it. Callers no longer see a
scan result until it has been judged.

## Canary

`node scripts/rcap-official-forms/d0-canary-verify.mjs` — **147 checks across 7
canaries and 9 mutations**, up from 107 across 4 and 6.

Two canaries are new. `print-flags` is a form whose widgets disagree about
whether they print: a printable participant field, a Hidden helper carrying
Nebraska's real wording, a NoView routing field, and Reset / Clear Form / Print
Form buttons — one with no `/F` entry, one with `/F 0`, to cover both spellings
of "does not print". Its official text is drawn into page content as the
control: a fix that suppresses too much fails here. `scripted-blank` is a source
whose widgets carry `/AA` → `/JS`, the exact shape the review found in the
sheets.

Three mutations are new, and each was confirmed to turn the suite red by
actually removing the fix from the source:

| mutation | result |
| --- | --- |
| flag-aware suppression removed | 10 checks red; all five non-printing elements leak |
| blank panel sanitation removed | 2 checks red, naming the residue that was embedded |
| final sheet sanitation removed | `UninspectableArtifactError` — the fail-closed gate fires |
| fail-closed inspection removed | 4 checks red; the uninspectable artifact passes again |

`node scripts/rcap-official-forms/d0-corpus-flag-audit.mjs` runs the corpus
audit. It needs the private source packs and skips cleanly without them.

## Scope

Changed: `rcap-active-content.mjs`, `rcap-contact-sheet.mjs`,
`rcap-official-form-finalize.mjs`, the two canary modules, and the canary
evidence directory.

No state package directory changed. No image-input path changed —
`package.json`, `package-lock.json`, `tsconfig.json`,
`scripts/rcap-render-worker.mjs`, `scripts/lib/`, `src/` and the worker
Dockerfile are untouched, so the frozen worker fingerprint holds.

## Two D0 defects this branch does not fix

The review found two more defects in these same modules. Neither is among the
three this cycle authorized, so both are recorded rather than fixed — widening a
shared-tooling commit that seven lanes build on is not a call to make silently.
Five of the 61 families are blocked on them:

- **Subset-font text layers do not decode.** `rcap-pdf-anchor-capture.mjs`
  `loadFonts()` reads only `Subtype`, `FirstChar`, `Widths` and `MissingWidth`,
  never `/ToUnicode` or `/Encoding /Differences`, so content-stream byte codes
  are used verbatim as characters. `WA:blake-006-form-en`,
  `WA:blake-008-form-en`, `WA:crrlj-09-0100-form-en` and
  `WA:crrlj-09-0870-form-en` were dispositioned as having no extractable text or
  no matching participant label; the reviewer decoded them by hand and found
  usable content, so those dispositions rest on a false premise.
- **Rich-text AcroForm fields abort the whole family.** `sanitizeAndFlatten`
  calls `updateFieldAppearances()` with no guard for `/RV` fields, so
  `MO:cr145-form-petition-en` throws `RichTextFieldReadError` and produces no
  artifact at all. The lane disclosed this and correctly claimed no fill.

Both are in `docs/record-clearing/d-wave/corrections-v2/correction-index.json`
under fix route `shared_factory_outside_the_three_named_defects`.
