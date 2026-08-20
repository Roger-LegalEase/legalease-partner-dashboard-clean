# Gate B — independent review, wave C, shard b

Reviewer B. Review base `e94fb456`. Four families, one new verdict each.
This shard reviewed artifacts it did not produce, and it repairs nothing.

| Family | Verdict |
| --- | --- |
| NC:aoc-cr-287-form-en | correction_required |
| NC:aoc-cr-288-form-en | correction_required |
| NC:aoc-cr-296-form-en | substantive_owner_decision_required |
| NC:aoc-cr-298-form-en | correction_required |

Nothing in this shard is approved, and the reason is the same for all four.

## The source bytes are not here

`RCAP_BUNDLE_EXTRACT` is unset, and
`/home/user/legalease-rcap-pdf-inventory-closure/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`
does not exist on this filesystem. Searching the whole filesystem for that path,
for any `STATES/` directory, for any `*Master_Library*` directory and for the
pinned official PDFs by name returns nothing. The declared preconditions of 499
source-library files and 329 PDFs could not be counted either.

So §2 could not be performed. No official source SHA-256 was recomputed by this
reviewer for any family. Five records — `source-record.json`,
`source-receipt.json`, the rerender record, the all-page record and the
provenance sidecar — agree on each family's source digest, but all five were
written by the lane under review, and §2 says a receipt is not source proof.
Approval would rest on precisely the evidence §2 excludes, so no family is
approved. For AOC-CR-298, the one family carrying a published locator, an HTTPS
fetch of the recorded URL was attempted and refused by this environment's egress
policy.

Everything that does not need the source bytes was done in full: every other
hash recomputed from disk, every relevant page inspected as an image, every bound
value located in the artifact's content stream and compared with the rectangle
its own map declares, the whole document searched for every canonical fact, and
the blank and filled halves of every contact-sheet page diffed word by word.

## What the artifacts actually show

The placement work is sound. Across all four families every bound value sits
inside its own declared rectangle, no canonical fact appears anywhere it should
not, nothing is duplicated into a second field, nothing is clipped, every
artifact is flattened with no XFA, JavaScript or actions, and page 2 of every
family is word-for-word identical to the blank rendering.

That last fact closes the objection that prompted the new contract. **AOC-CR-288
no longer writes the petitioner's name into the judge's FINDINGS OF FACT block on
page 2** — the filled half of that page adds nothing at all. **AOC-CR-298's
certificate-of-service block is blank** and the deterministic filing date appears
nowhere, which is the defect class NE DC-1-15 is still held for.

## The four findings that matter

**AOC-CR-298 carries a stranger's name into an AOC certification block.** The
finalized artifact shows `Courtney Bailey` in the *Name Of Records Officer (type
or print)* cell of *REPORT BY ADMINISTRATIVE OFFICE OF THE COURTS* on page 2. The
renderer did not write it — it is in the blank rendering too, so it arrives with
the pinned source and flattening makes it permanent. It sits in no declared
widget rectangle, so no classification or refusal reaches it, and
`protected-fields-scan.json` states its own basis as *what the renderer wrote*,
which is why every existing check calls this family clean. The string `Courtney`
appears nowhere in this repository. Deciding whether the official blank form
prints that name, or whether the archived source is a used copy, needs the source
bytes.

**AOC-CR-298's recorded `sourceUrl` describes a different form.** It names
nonviolent *felonies* and names the *instructions*; the artifact is AOC-CR-298
`(NONVIOLENT MISDEMEANOR(S))`, which states on its own face that felony
expunctions use AOC-CR-297. The URL does not contain the string `AOC-CR-298`.
The other three families correctly carry a `master-library:` locator and digest.

**AOC-CR-296 is a prosecutor's instrument being filled as a participant's.** It
is captioned *DISTRICT ATTORNEY PETITION*, its identity block is *Name And
Address Of Defendant*, it signs off *District Attorney Name (type or print)*, it
says it is filed by the district attorney and needs no filing fee, and page 2
closes with a *NOTE TO DISTRICT ATTORNEY*. The source record classifies it
`participant_completed` and `participantFillable: true`. That is an owner's call,
and it decides whether the two technical corrections below are worth making.

**Region and caption text is attributed across columns.** The petitioner
name/street/city block is one column at x≈37 width 278, and its three widgets get
three different region headings — each a different line of the form's title block
in the *adjacent* column. On AOC-CR-296 that title line is `DISTRICT ATTORNEY
PETITION`, which matches the `prosecutor` rule, so `StreetAddr` and `MailAddr`
are refused as protected and **the filed petition carries a name, a city, and no
street address**. The same defect one level down makes `effectiveLabel` a whole
caption row rather than a field's own caption: `PetitionerState`,
`PetitionerZip`, `DriversLicenseState`, `Race` and `Sex` all share the label
`Drivers License No.StateRaceSex`, which is why `PetitionerZip` and `NameAtty`
are refused as `race` and `DOB` and `CityAtty` as `money`. Those misfires are
fail-closed and cost only an untrue reason — but `PROTECT_RULES` order means an
accidental early match pre-empts the correct later rule, and on AOC-CR-296 the
same mechanism fails in the direction that costs the participant data.

Separately on AOC-CR-296, `DLState` takes `participant.state`. The field has no
printed caption, so the binder matched the token `State` in the field name alone;
it is the licence-issuing state, not the state of residence. The canonical
fixture hides it because both read `XX`. The same conceptual field is refused on
the other three families in this shard, which is itself a sign the decision is
not resting on a stable input.

## Note on §5

These are AcroForm families and each carries a classification, so the relaxed
flat-overlay assertion was not leaned on. It is worth recording the inverse
hazard anyway: here the class is *present*, is relied on, and is demonstrably not
about the field it is attached to. Approval was not taken from any classification
— every value was proved into its rectangle geometrically and then looked at.

## Records

- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/assignment.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/verdicts.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/NC-aoc-cr-{287,288,296,298}-form-en.review.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/verify-wave-c-shard-b.mjs`

Run `node data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/verify-wave-c-shard-b.mjs`.
