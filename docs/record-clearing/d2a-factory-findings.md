# D2A — findings against the shared D0 factory

Defects in `scripts/rcap-official-forms/` that lane D2A hit while building
Arizona, Illinois, Washington, Kansas and Minnesota, and that it worked around
rather than fixed, because the shared factory is read-only to a state lane.

Each is worked around **by refusing**, never by writing anyway. The affected
fields are left blank and are listed in the relevant family's
`reports/protected-fields.json`.

## 1. The descriptor list resolves `Email Address` to the street address

`FACT_DESCRIPTORS` in `rcap-field-semantics.mjs` is most-specific-first and
`decideBinding` takes `matches[0]`. `participant.street_address` is listed at
index 5 with `\baddress\b` in its pattern; `participant.email` is at index 9.
Any field whose name ends in the word *address* therefore resolves to the street
address, and `Email Address` is a common name for an email field.

Hit by Kansas `KS-NOTICE-OF-HEARING…` (`Email Address`), Kansas `KSJC`
(`Email Address`, `Email Address_2`) and, on the flat-overlay path, Arizona
`AOCCREM2F-071221` and `AOCCREM3F-071221`, whose petitions print
`Email Address: ______`.

The module's own comment says a tie is "a defect in the list rather than
something to resolve at runtime", which is right — and this is one. The fix
belongs in the shared list: either move the email descriptor above the address
descriptor, or narrow the address pattern so it does not match a name whose
preceding token is `email`.

Worked around by refusing the field. Note that on the overlay path the refusal
is automatic: the lane's blank-binding table tests email before address, so the
anchor claims `participant.email` while D0 reading the same label claims
`participant.street_address`, the two disagree, and the anchor is dropped.

## 2. The attorney protect rule misses the plural and the word "lawyer"

`PROTECT_RULES`' attorney entry is
`/\battorney\b|\bcounsel\b|\besq\b|law\s*firm|bar\s*(no|num|number)/`.

- `\battorney\b` does not match `Attorneys name if any`, because the word
  boundary fails on the trailing `s`. Kansas `KSJC` names its counsel field
  exactly that, and the binder resolved it to
  `participant.full_legal_name`.
- Nothing in the rule matches `lawyer`. Illinois writes *lawyer* throughout
  where other states write *attorney*: `EXP-AD-REQUEST` and `FW-CIV-APPLICATION`
  carry `Lawyer Name`, `Lawyer Address`, `Lawyer Phone Number` and
  `Lawyer Email`, and the binder resolved each to the corresponding participant
  fact. Left as it is, the factory fills counsel's own address and telephone
  from the participant's contact details.

Worked around by a lane deny rule matching `lawyer`, `attorneys`, `client` and
`law firm`. The fix belongs in the shared rule.

## 3. `\bcourt\b` is not protected where a court's own address is

The court protect rule covers *court use only* and *for court use*, but a form
that prints `Court Address: ______` above a rule line has no rule against it,
and the generic address pattern claims it. Washington `BLAKE-003` does exactly
this, and the overlay anchored the participant's street address onto the court's
address line.

Worked around by a lane deny rule for `court address` / `address of the court`.

## 4. A whole-document service block has no ownership category

D0 protects a service block wherever it appears as a field on another form.
Washington `BLAKE-004` is a proof of service end to end: every blank on it
records who served what on whom and where. The individual labels — `at this
address:` — carry none of the service tokens the rule looks for, so the overlay
anchored the participant's address onto the served party's address line.

Worked around by treating a manifest `document_role` of `SERVICE` as a no-fill
document, the same way `INSTRUCTIONS` is treated.

## 5. `implement-rcap-official-forms-d1.mjs` references an undeclared variable

Lines 541 and 546 pass `nonFilingNotice: notForFilingNotice`. No binding named
`notForFilingNotice` is declared anywhere in the module. The reference sits
inside the `try` that wraps rendering, so at runtime it raises a
`ReferenceError` that the `catch` records as
`{ check: "finalize_refused" }` — every family in that script's index would come
out with no fixture, no contact sheet and a recorded refusal, rather than an
error anyone would notice.

This lane does not run that script and did not edit it. Flagged for whoever owns
it.

## 6. Not a defect: the manifest's field counts

Five families' `field_count` in `STATE_MANIFEST.csv` exceeds the first-hand
census — Arizona `AOCCRSL1F-050825` declares 97 against 71 observed, Illinois
`EXP-AD-REQUEST` 160 against 151. The manifest appears to count widgets and the
census counts fields; several fields on these forms own more than one widget
(Illinois `7 - Case Number` owns six, one per page header). Recorded as a
fidelity finding in each family's source record so the captain can reconcile the
convention, not treated as drift.
