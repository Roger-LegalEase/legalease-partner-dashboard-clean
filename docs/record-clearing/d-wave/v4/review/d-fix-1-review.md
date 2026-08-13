# D-FIX-1 — independent review — MO CR-145

**Family:** `MO:cr145-form-petition-en`
**Branch reviewed:** `claude/rcap-d-fix-1-mo-cr145` (family commit `4c8aa85`, factory base `257bf04`)
**Disposition: `correction_required`**

## The short version

The fix itself is right, and it is right for the right reason. The petitioner's name is
gone from the "Other Defendants" widget, it is still in the two fields that legitimately
carry it, exactly one binding was removed, and the other ten are byte-for-byte unchanged.
I confirmed all of that from the bytes with my own parser, not from the reports.

The package around it is not ready to hand to QA or counsel. Six files were not
regenerated and now contradict the corrected artifacts. Two of them matter a lot:
`handoff.md` still lists `Other Defendants ← participant.full_legal_name` as a written
field, and `reports/determinism.json` certifies the digest of the artifact this commit
replaced. Separately, the refusal ledger shrank from 37 disclosed refusals to 1, so the
package no longer records why 37 of its 48 fields are blank.

None of that undoes the correction. All of it has to be fixed before the evidence in the
package can be relied on, because each of these files reads as verification.

## How I checked it

The source PDF is not in git, so I could not verify the source digest, the census against
the original AcroForm, or the reproducibility claim. Everything else I read from the
rendered bytes. **No finding below depends on the source binary.**

The factory's own read-back helpers are the same code that wrote the artifacts, so I did
not use them for the primary check. I wrote a dependency-free PDF reader for this review:
raw object parse, FlateDecode inflation, full content-stream interpretation
(`q`/`Q`/`cm`/`BT`/`Tm`/`Td`/`TJ`), recursion into Form XObjects composing the CTM, and a
report of every drawn run in device space with the XObject chain that drew it.

The artifacts are fully flattened — no `/AcroForm`, no `/Widget`, both `/Annots` arrays
empty — so every former widget is a `FlatWidget-*` Form XObject drawn onto the page. I
matched all 48 placements to the 48 census rects by geometry. Worst match error: **0.012pt**.
Attribution of drawn text to field is unambiguous.

## What is confirmed good

**The widget is blank.** The XObject at the "Other Defendants" rect (page 1,
x=56.2 y=381.15 w=513.47 h=46.33) draws no text at all.

**The name is still where it belongs.** `Marion T. Ellsworth` is drawn at the "Petitioner"
widget on page 1 (y=639, directly above the printed word "Petitioner" at y=623, beside
"vs." at y=637) and at "Full Name" on page 2 (y=761).

**The label is what the map says.** Page-1 printed text at y=430.0, starting at x=57.60 —
immediately above the widget top edge at y=427.48 and left-aligned with it — reads
`Other (include name and address of agency):`. Exactly the `measuredLabels` entry.

**The correction is substantively right, not just defensible.** Page 1 line y=63 reads
*"I have reason to believe the agencies named above as defendants may possess records
subject to expungement."* The widget is the free-text slot in an agency-defendant list.
The old binding told a court the petitioner was an additional respondent agency.

**Exactly one binding was removed.** Map diff: 11 → 10 bindings, removed `['Other Defendants']`,
added `[]`, zero factId changes among the survivors. Corroborated at the byte level — I
pulled the pre-fix artifact out of git and re-parsed it. It draws 11 values, the new one
draws 10, and the delta is exactly `Marion T. Ellsworth` in the "Other Defendants" rect.
Every other field draws an identical string at an identical position. The claim that a
correction subtracts holds.

**The ten survivors are correct against the printed form.** `County` → `Greene` lands in
the caption blank of *"IN THE __ JUDICIAL CIRCUIT, __ COUNTY, MISSOURI"*. `Case Number`
lands on the *"Judge: __ Case Number: __"* line. `Criminal Case Number` lands after
*"arrest, for the following criminal case:"*. Page-2 fields sit under their own captions.
Nothing is misplaced.

**The measured labels are honest.** Every `measuredLabels` entry for a bound field is a
true substring of real page text at the stated position — including the unflattering ones
like `COUNTY, MISSOURI` for "Case Number" and `Court ORI No.:` for "Petitioner". The label
channel reports what it measured rather than what would look tidy. That is what makes the
protect-but-never-select asymmetry safe to rely on, and it is correctly implemented.

**Manifest, contact sheet, and cleanliness all check out.** All four digests recomputed and
matched. The contact sheet I verified by content, not just digest: its filled panels embed
`EmbeddedPdfPage` XObjects whose nested `FlatWidget` children are the *same ten* XObject
names carrying the *same ten* values as the finalized artifact — an intermediate would have
carried an eleventh. Scanning raw bytes and every inflated stream across all four artifacts
for `/XFA`, `/JavaScript`, `/JS`, `/AA`, `/OpenAction`, `/Launch`, `/SubmitForm`,
`/ImportData`, `/URI`, `/GoToR`, `/GoToE`, `/Movie`, `/Sound`, `/RichMedia`, `/EmbeddedFile`,
`/Rendition`, `/SetOCGState`, `/AcroForm`, `/Widget`, `/RV`, `/Names`, `/OCProperties`:
**zero hits anywhere**. Only `/Subtype` values present are Form, Image, TrueType, Type1. No
object carries `/Widget` or `/T`, so no orphaned widget. The negative fixture draws nothing.

**The boundary withdrawals are real and disclosed.** Two values withdrawn (`Petitioner`
overflowing 10.43pt right, `Full Name` 4.66pt, both 66/66 chars, both with geometry). I
confirmed both widgets are blank in the new boundary artifact and that the pre-fix one did
draw the 66-character name in both.

**All four verifier runs pass.** v4 canary 35 checks, v3 canary 43, v0 canary 149,
`d-v4-verify-corrections.mjs MO:cr145-form-petition-en` 8/8. (pdf-lib was absent from the
container; I installed it to scratchpad and symlinked it in, then removed it. Nothing from
it was committed.)

## Findings

| id | sev | what |
|---|---|---|
| D-FIX-1-R-001 | high | `handoff.md` still lists `Other Defendants ← participant.full_legal_name` as written |
| D-FIX-1-R-002 | high | `determinism.json` certifies the digest of the **pre-fix** artifact |
| D-FIX-1-R-003 | medium | refusal ledger narrowed from 37 disclosed refusals to 1 |
| D-FIX-1-R-004 | medium | `protected-fields-scan.json` not re-run; `pass: true` over superseded bytes |
| D-FIX-1-R-005 | medium | `mutation-tests.json` stale; caption-only proof silently degenerates |
| D-FIX-1-R-006 | medium | `field-classification.json` still classes the field as `participant` |
| D-FIX-1-R-007 | medium | factory `outside_party` rule does not match its documented contract |
| D-FIX-1-R-008 | low | verifier assertions cannot distinguish the fix from an empty render |
| D-FIX-1-R-009 | low | `source-record.json` factoryVersion stale |

Full acceptance conditions are in `d-fix-1-review.json`. The three that need explaining:

### D-FIX-1-R-002 — the determinism report describes an artifact that is gone

`reports/determinism.json` records `firstSha256 = secondSha256 = 4b2e82c2…` and
`identical: true`. That is the digest of the **pre-fix** `canonical-filled.pdf` — I verified
it by extracting the artifact from `4c8aa85^` and hashing it. The artifact shipping now is
`e3821297…`.

This is precisely the failure mode `d-v4-verify-corrections.mjs` names in its own comments —
*"a manifest that describes something else is worse than no manifest, because it reads as
verification"* — occurring in a report that verifier does not check.

### D-FIX-1-R-003 — the ledger subtracted too

Before this commit, `production-field-map.json` carried 37 `bindingRefusals` and
`reports/protected-fields.json` carried 37 `unwritableFields`, each with field, class and
reason: `County Sheriff's Dept → agency`, `Race → race`, `Offense Charged →
requires_explicit_mapping/sensitive_fact`, and so on. Both now list exactly one entry. 47
`measuredLabels` were added, but a measured label is not a refusal reason.

Two things follow. The evidence that the three sibling agency fields were refused *as
agency* — the comparison the original finding D-V3-R-007 actually rested on — is no longer
in the package. And `protected-fields-scan.json` still asserts `unwritableFieldsChecked: 37`
while nothing in the package any longer names those 37.

`rcap-field-semantics.mjs` states its own contract as *"a field that fails any of these is
reported with the reason it was refused, so a refusal is auditable rather than silent."*
AGENTS.md makes these artifacts the mechanism by which counsel review happens. A correction
should subtract a binding, not the disclosure.

### D-FIX-1-R-007 — I attacked the factory rule; the asymmetry holds, the pattern doesn't

**The design is sound.** Labels may protect but never select, unless the name is positional.
The cost argument is right — an extra protection leaves a blank for a human, an extra
selection files the wrong fact with a court — and the implementation matches it
(`category = nameCategory ?? labelCategory`; `subject = positional ? effectiveLabel : name`).
I tried to break it on Missouri's own hard cases and could not: "Case Number" under the
caption line `COUNTY, MISSOURI` correctly takes the case number from the name, and
"Other Defendants" is correctly vetoed by the label. Both channels catch this field
independently, as the commit claims.

**It does not over-refuse.** I isolated the new alternation from the pre-existing pattern
and ran it against every binding in all 84 production field maps — **878 bindings, 0 newly
refused.**

**But the pattern does not do what its comment says.** The comment and the commit message
both claim `"Other"`, `"additional"` and `"co-"` mark an outside party *"regardless of which
party noun follows."* The implemented alternation has a **closed** noun list
(`defendant|part(y|ies)|respondent|petitioner|plaintiff|person|name` + plurals) and adds no
general `co-` rule beyond the pre-existing `\bco-?defendant\b`. Nouns that `FACT_DESCRIPTORS`
maps straight to `participant.full_legal_name` are missing from it. Calling `decideBinding`
directly:

```
Co-Petitioner     -> WRITABLE  participant.full_legal_name
Co-Applicant      -> WRITABLE  participant.full_legal_name
Other Applicant   -> WRITABLE  participant.full_legal_name
Other Movant      -> WRITABLE  participant.full_legal_name
```

That is D-V3-R-007 surviving verbatim under four different nouns. A reviewer who trusts the
comment would believe the class is closed. It is not — only seven nouns are covered.

This is not hypothetical. Recorded as an out-of-scope observation, not a correction required
of this branch: the approved family `alabama/c-94a-source-gated-en` binds
`Mailing Address of Board or other entity to be served` to `participant.street_address`, and
its `populated-fields.json` confirms it is written. The petitioner's own street address goes
into the box asking for the address of the Board to be served. The new rule misses it —
`entity` is not in the noun list, and the phrase has no parenthesis for the `\bother\s*\(`
branch. That family is on an older factory and was not re-run here.

### D-FIX-1-R-008 — are the verifier's assertions the right assertions?

They pass, and several are well chosen — the manifest digest check, the contact-sheet
provenance check, and reading the page rather than the field map are all the right instinct.
But the MO block cannot tell the fix from an empty render. Running the same absence check
against `negative-filled.pdf`, which draws nothing at all:

```
--- negative-filled.pdf ---
   Other Defendants     outcome=absent
   Petitioner           outcome=absent
   Full Name            outcome=absent
   => MO assertion "petitioner's name absent from Other Defendants" would: PASS
```

All four MO assertions pass on a package that wrote nothing. Nothing asserts the name is
still **present** where it belongs; nothing asserts the other ten bindings survived, which
was instruction 2 to me; nothing covers the two new MO boundary withdrawals, because the
overflow assertions are gated to VA and VT only; and nothing checks package-internal
consistency — which is exactly why all six stale files in findings 001–006 sailed through.
The absence check also runs through `verifyWrittenValue`, the factory's own helper, so it is
not independent of the code that wrote the bytes. I confirmed it separately.

## What I did not touch

Only the two review paths were modified:

- `docs/record-clearing/d-wave/v4/review/d-fix-1-review.json`
- `docs/record-clearing/d-wave/v4/review/d-fix-1-review.md`

No change to the family package, the factory, any ledger, or any other branch.
`d-v4-verify-corrections.mjs` writes `docs/record-clearing/d-wave/v4/correction-verification.json`
as a side effect; that output was moved out of the worktree and not committed.
