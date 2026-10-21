# SCA-C903 has no acquittal ground, and the route requires one

**Status:** open, for Roger. Nothing has been built for the acquittal branch.
**Measured:** 2026-09-10 by lane PF25, on the pinned bytes.
**Grants nothing.** No route is opened, no family promoted, no scope narrowed.

## What the owner asked for

`wv_nc_acquittal_dismissal-set` is one of five product-path families the owner
reclassified out of the legal queue into route-mapping work. Its recorded next
executable action:

> Map the exact disposition fact to the correct SCA-C903 ground, refuse unclear
> records, and release the official-form build.

PF25 did the first half and refused the second, which is why nothing was built.

## The dismissal branch maps

Dismissal binds to SCA-C903 page 1 ¶2:

> "That on ____ (Date of Dismissal), this matter was dismissed by the ____ Court of
> ____ County, due to ____ (Reason for Dismissal.)"

reinforced by pre-printed ¶4. One candidate ground, elected. The fact is stated in
`src/lib/legal-authority/routes/national-report-batch-c.json` requiredFacts[0], in the
compiled West Virginia profile as `likely_eligible_dismissal_60_days`, and in the
packet-set manifest's own question.

## The acquittal branch does not

**Zero candidate grounds.** The word "acquittal" occurs five times in SCA-C903 and
**not once in an operative allegation**: the page-1 title block, the running footer on
each of pages 1–3, and the certificate of service naming the paper being served.
"not guilty", "verdict" and "judgment of acquittal" occur **nowhere** in the document.

The only disposition recital the form prints says the matter *was dismissed by a
court*, into blanks the Supreme Court of Appeals itself labelled "(Date of Dismissal)",
"(Type of Court: Municipal, Magistrate, Circuit)" and "(Reason for Dismissal.)".

Electing that ground for an acquittal would write an acquittal into dismissal blanks
and leave ¶4 swearing that sixty days have elapsed since *"the above referenced
dismissal"* — a dismissal that did not happen — on a motion the movant signs pro se.

## The refusal is not an artefact of which binary is bound

PF25 checked. A second SCA-C903 sits in custody — `242048f1…`, two pages, AcroForm,
unencrypted, which is also the revision the family's own `officialSourceUrl` points at
— and it carries the **same dismissal-only operative body**. It was opened for that
test alone and nothing was substituted.

## Why this is yours and not a lane's

Acquittal is the **first branch of the route's own first required fact** and a
separately held profile signal. It is not a corner of the family. Three answers are
available and each is an owner decision:

1. **A different instrument carries acquittal relief in West Virginia**, and the route
   should bind it. If so, name it and it becomes source work.
2. **The route's scope narrows** to dismissal only, and the acquittal branch moves to
   its own family or is withdrawn. Narrowing a route's declared scope is not a lane's
   call.
3. **The form is used as printed** and the acquittal participant is told what the form
   does not cover. That is a product decision about what we will and will not deliver.

Nothing was written toward any of them.

## Two record contradictions found alongside it

**The manifest and the queue are pinned to different binaries of the same form
number.** `legal-design-packet-set-manifests.json` places the movant's signature on
"SCA-C903, page 1" and the whole certificate of service on "page 2". The **bound**
binary is three pages, with the signature on page 2 and the certificate entirely on
page 3. The two-page publication the manifest describes is the one the family's own
`officialSourceUrl` names.

**`local-source-corpus-index.json` records the bound SCA-C903 as
`structuralClassObserved: "unreadable"`** with a pdf-lib load error. It opens in
poppler and pikepdf with an empty user password: three pages, no AcroForm, no
annotations. It is flat and encrypted, not corrupt — and a source recorded as
unreadable is a source no lane will try.
