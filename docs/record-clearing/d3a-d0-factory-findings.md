# D3A — defects found in the shared D0 factory

Four things in the shared tooling stopped lane D3A from completing work it could
otherwise have completed. None is fixed here: `scripts/rcap-official-forms/` and
`src/**` are outside this lane's owned paths, and a lane quietly patching the
shared factory is how seven concurrent lanes end up with seven different ideas
of what the factory does. Each is recorded with the evidence that found it.

The D0 canary passes — 107 checks — both before and after this lane's work.
These are gaps the canary's four synthesized forms do not reach, found by
running the factory over 65 real state binaries.

## 1. A field named `Date` can never bind the filing date

`FACT_DESCRIPTORS` gives `deterministic.filing_date` the alternative
`/^\s*dated?\s*$/`, which reads as "a field named exactly Date or Dated".

It cannot match. `haystack()` returns a separator-normalized form and a fully
squashed form joined by ` || `:

```
haystack("Date") === "date || date"
```

An anchored `^...$` alternative is therefore tested against a string that always
contains ` || `, so it never fires:

```
decideBinding({name: "Date", pdfType: "text"}, {})
  → { writable: false, reason: "no_allowlisted_fact_matches" }
```

The other alternatives in that descriptor — `date signed`, `signature date`,
`date of filing` — are unreachable for a different reason: each is caught first
by the `signature` or `notarization` protect rule, which is correct. The net
effect is that `deterministic.filing_date` is allowlisted but unbindable, and
the `deterministic` class is empty across all 66 families in this lane.

It is the only descriptor in the list carrying a `$` anchor, so nothing else is
affected; start-anchored alternatives such as `participant.street_address`'s
`/^\s*addr/` still match, because the haystack's first half begins at position
zero. Whether the fix is to test the two haystack halves separately or to drop
the trailing anchor is a decision for whoever owns the binder.

## 2. `\baddress\b` shadows the email descriptor

`participant.street_address` is listed ahead of `participant.email`, and its
match includes a bare `\baddress\b`. `decideBinding` takes the first matching
descriptor, so:

```
"Email Address" → participant.street_address
```

North Dakota's petition packet has exactly that field, and it would have
received a street address. The lane withheld it and recorded the reason; it is
in `north-dakota/expertise-form-instructions-en/reports/reviewed-withholdings.json`.

The descriptor list is authored rather than inferred, so its comment already
treats an ordering collision as a defect in the list. This is one.

## 3. A rich-text field aborts the whole artifact

`sanitizeAndFlatten` calls `form.updateFieldAppearances()` before flattening,
which regenerates every field's appearance. pdf-lib cannot read a rich-text
field's value and throws:

```
RichTextFieldReadError: Reading rich text fields is not supported:
  Attempted to read rich text field: Other Defendants
```

One such field anywhere on a form kills the finalized artifact for that form,
including all the ordinary fields around it. Missouri CR145 — Petition for
Expungement of Arrest Records — carries two: `Other Defendants` and
`Address at Time of Arrest`. It is the only affected family in this lane.

The lane refused rather than routing around it. Clearing the rich-text flag
would have meant rewriting the source binary, and the source binary is the thing
being certified. CR145 is inventoried, censused and classified, with no fill
claimed and the hold `d0_factory_cannot_finalize_rich_text_acroform`.

A fix belongs in the shared sanitizer: skip appearance regeneration for
rich-text fields, or clear the flag on the in-memory copy after the source hash
has already been verified.

## 4. Three Texas binaries are not traversable

Three of Texas's instruction PDFs hash-verify against the manifest and load, but
throw on `getPages()`:

```
Expected instance of PDFDict, but got instance of undefined
```

- `TX-GC-411.072` — Instructions for Petition under § 411.072
- `TX-GC-411.0729` — Instructions for Petition under § 411.0729
- `TX-GC-411.073` — Instructions for Petition under § 411.073

The page tree does not resolve under pdf-lib's strict lookup. All three are
reference material that would never be filled, so nothing is lost operationally,
but no census, page geometry or text layer can be recorded for them and each
carries `binary_not_traversable_by_factory_loader`. They are inventoried by
identity alone.

Worth noting that the manifest declares `TX-GC-411.072` as `acroform_pdf` with
25 fields while `getForm()` on the same bytes returns none, so a second opinion
on these three binaries is worth having before concluding the fault is only in
the reader.

## Not a defect: manifest field counts

26 families show a manifest `field_count` that differs from a first-hand census
of the hash-verified binary. These are recorded as `fidelity` findings rather
than blockers. The manifest governs identity and the binary governs the census,
which is the rule this wave was given, and the differences are consistent with
the manifest counting widget annotations where the census counts fields.
