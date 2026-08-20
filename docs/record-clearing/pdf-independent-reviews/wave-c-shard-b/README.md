# Gate B — independent review, wave C, shard b

Reviewer B. Review base `e94fb456`. Four families, one new verdict each.
This shard reviewed artifacts it did not produce, and it repairs nothing.

| Family | Verdict |
| --- | --- |
| NC:aoc-cr-287-form-en | **approved_platform_ready** |
| NC:aoc-cr-288-form-en | **approved_platform_ready** |
| NC:aoc-cr-296-form-en | substantive_owner_decision_required |
| NC:aoc-cr-298-form-en | correction_required |

## The source bytes

The shard b source pack was installed into `private/source-imports/` and
`RCAP_BUNDLE_EXTRACT` set, so §2 was performed in full. Each family's source was
resolved through its own committed `canonicalBundlePath`, its SHA-256 recomputed
from the bytes, and compared against the digest pinned in its committed
`source-record.json` — **not** against the pack's own manifest, so the pack could
not vouch for itself. All four match on digest and on byte length. Each source's
visible form number and revision agree with its pinned identity, none of the
sources carries a prefilled widget value, and none contains a fixture fact.

One residual stays with the captain: the pack carries only this shard's four
PDFs, so the declared whole-corpus preconditions of 499 source-library files and
329 PDFs remain uncounted. `private/` is gitignored and nothing from it is
tracked.

Everything else was done as before: every other hash recomputed from disk, every
relevant page inspected as an image, every bound value located in the artifact's
content stream and compared with the rectangle its own map declares, the whole
document searched for every canonical fact, and the blank and filled halves of
every contact-sheet page diffed word by word.

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

**The archived AOC-CR-298 source is not a blank form.** The finalized artifact
shows `Courtney Bailey` in the *Name Of Records Officer (type or print)* cell of
*REPORT BY ADMINISTRATIVE OFFICE OF THE COURTS* on page 2. With the source pack
installed this is now settled, and it settles against the family. The name is in
the **source's own page content stream**, at the same rectangle, in
`Arial-BoldMT` at 10pt — while the caption directly above it, like every caption
on the form, is `Arial-ItalicMT` at 7pt. The adjacent *Date* and *Signature Of
Records Officer* cells are empty. None of the source's 107 widgets carries a
value, so it is not a field default: it is a filled-in entry that was flattened
into an otherwise-blank form before archiving. Across all four sources in this
shard it is the only non-heading bold run that is not a form title.

The source digest matches its committed pin exactly, so the chain of custody is
intact and the renderer is blameless — the defect is in *what was acquired*. But
every artifact rendered from this source carries a real person's name,
permanently, inside an Administrative Office of the Courts certification block.
It lies in no declared rectangle, so no classification reaches it, and
`protected-fields-scan.json` states its own basis as *what the renderer wrote* —
which is why this family reads clean everywhere else, through two review waves.

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

## Why two families are approved and two are not

AOC-CR-287 and AOC-CR-288 are approved: sources verified from their own bytes,
every value proved into its own rectangle and then looked at, every protected
region blank, page 2 untouched, flattened and inert. Three advisories are
recorded against them — cross-column region and caption attribution, silent
omission of values too long for their cell, and an undecoded caption on
AOC-CR-287 — and none of the three changes what those artifacts do. They are
wave-level corrections, not family blockers.

AOC-CR-296 and AOC-CR-298 are held for reasons that have nothing to do with their
digests, both of which verified.

## Records

- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/assignment.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/source-verification.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/verdicts.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/NC-aoc-cr-{287,288,296,298}-form-en.review.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/verify-wave-c-shard-b.mjs`

Run `node data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/verify-wave-c-shard-b.mjs`.
