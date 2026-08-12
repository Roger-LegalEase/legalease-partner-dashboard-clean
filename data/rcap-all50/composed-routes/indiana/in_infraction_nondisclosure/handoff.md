# Handoff - in_infraction_nondisclosure (IN, lane C1, composed route)

Job `T-C-IN-complete-composed-route` - treatment `complete_composed_route` - registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| I.C. 34-28-5-15 | The whole remedy: the court's own duty to order non-disclosure in four situations, and the verified-petition branch where the court did not act or after a deferral or satisfied judgment |

Official sources recorded on the track: I.C. 34-28-5-15 (iga.in.gov), I.C. 35-38-9 (iga.in.gov), the Coalition for Court Access expungement forms index, and the Office of Judicial Administration expungement page. All four carry `sha256: null`.

This is the entire authority list. The registry records one citation for this track and no others.

## Mechanism

The court must order the clerk and any case management system operator not to disclose infraction information to a non-criminal-justice organisation or individual where the person is not prosecuted, the charge is dismissed, the person is adjudged not to have committed the infraction, or an adjudication is later vacated. That does not reach deferred prosecutions. Where the court failed to act, a petition branch applies with earliest filing dates. A deferral or satisfied judgment supports a verified petition no earlier than five years after satisfying the conditions.

Five earliest-filing conditions are recorded: 30 days after judgment (found not to have committed); 365 days (order vacating an adjudication becomes final or is certified); 2 years after the conduct (not prosecuted); 30 days after dismissal (no new action filed); 5 years (deferral conditions or judgment satisfied). No artifact in this route computes or displays any of them.

## Route decision

Composed route, `compositionMode: sequential`, two units:

1. `in_infraction_nondisclosure-stage-1` - `process_guidance`, `available: true`. Implemented as a **participant_instruction** component. The registry says it plainly: "This stage generates no packet."
2. `in_infraction_nondisclosure-stage-2` - `custom_pleading`, **`available: false`**. Carried as a `pleading_document` unit with a `blockedDependency`. No petition is drafted.

Nothing else in the registry entry or the compiled profile describes a document for this track - no proposed order, no notice, no cover sheet, no attachment, no agency letter.

## What is deliberately absent

- **The stage-2 verified petition.** Blocked. See below.
- **Any MC case-type filing convention.** That is one of the two open questions; asserting one would be inventing the answer.
- **Verification wording and any officer requirement.** The registry says the petition is verified and signed by the petitioner and records `notarization: none`, but states no verification statute and no officer. Handled the way the ND config handles its missing verification statute: null and flagged, never invented. The compiled profile's affirmation formula ("I AFFIRM, UNDER THE PENALTIES OF PERJURY, THAT THE FOREGOING REPRESENTATIONS ARE TRUE AND ACCURATE") is Coalition for Court Access conviction-expungement form text and is **not** carried across to this mechanism.
- **A drafted request letter to the clerk.** The registry records an oral enquiry, not a written request. Nothing is drafted for it.
- **Court, county, cause number, judge, prosecutor, prosecutor position, dates, fees beyond "none", service completion, hearing outcome.** None asserted anywhere.

## Blocked unit - exact missing source

`in_infraction_nondisclosure-primary-filing-2`

> Determination, from the Coalition for Court Access expungement forms index at https://www.in.gov/courts/iocs/self-service/expungement/ (official source recorded on this track, retrieved 2026-07-30, sha256 null), of (a) whether a statewide form exists for an I.C. 34-28-5-15 infraction non-disclosure petition and, if one does, acquisition of that current official form; and (b) how Indiana counties handle the MC case-type assignment where no cause number was assigned.

Owning lane: lane-D/E official-source acquisition and source-question closure. Registry `implementationQueue`: `D_composed_or_process_guidance`. Manifest: `components/in_infraction_nondisclosure-primary-filing-2/dependency.json`.

Note the shape of this block. It is **not** a named official form awaiting acquisition - it is the prior question of whether such a form exists at all. If the answer turns out to be "no statewide form", stage 2 becomes a drafting job for lane C; if "yes", it becomes an official-form fill for lane D/E. Either way the route's unit enumeration does not change.

## Open counsel flags (12)

Release blocker: the statewide-form and MC case-type question, sourced to `LegalEase-Indiana-Legal-Review.md`, heading TRACK 10 - INFRACTION NON-DISCLOSURE ("Additional research required... before building").

Scope restrictions carried as flags: the deferral branch split (the automatic branch never reaches deferred prosecutions); never say records are destroyed; disclose that a case file opened for record relief is public until the order is granted; opposition and hearing are outside-party and court acts, never stated as facts.

Gates: `legalStatus: legal_review_pending`; output, visual and technical-proof review all outstanding; every official source lacks a sha256; and the compiled IN profile is silent on this track entirely.

## F-review pointers

- **F / source freshness:** four official sources with `sha256: null`. Capture hashes before release.
- **F / profile coverage gap:** `src/lib/rcap-engine/compiled/profiles/IN-indiana.json` has **zero** occurrences of `34-28-5-15` and zero of `infraction`. Its four pathways are all I.C. 35-38-9 expungement routes and its `packetGenerator.formInventory` lists only expungement forms. The registry entry is the sole enumerating source for this track. Either the profile needs extending or the registry needs accepting as the source of record.
- **F / normalizer defect in the IN profile:** `pathways[].exclusionRules[]` contains raw OCR-style form text - the entire AFFIRMATION and CERTIFICATE OF SERVICE block of CCA-XP-0220-7007, plus the Form ACR caption, the Notice of Exclusion of Confidential Information and the Confidential Information Form XP - dumped into a field meant for exclusion rules. That is a compiler bug worth fixing upstream: an exclusion rule engine reading those strings will behave unpredictably.
- **F / terminology conflict:** the profile's `terminology.primaryConsumerTerm` is `expungement` with `avoidUniversalExpungementLabel: true`. This track's remedy is **non-disclosure of infraction information**, not expungement. The profile field must not be allowed to relabel it.
- **F / build order:** the registry carries the instruction "Build this track last, per the review's build order." This artifact is a data-only route enumeration, not a build of stage 2, so it does not front-run that instruction - but stage 2 drafting should respect it.

## Evidence

- `src/lib/rcap/state-packs/indiana/all50-build-metadata.ts`, `src/lib/rcap/state-packs/indiana/index.ts`
- `src/lib/rcap-engine/compiled/profiles/IN-indiana.json` (sha256 `0202d536113b16be9e02f1ea2bbd925c60d0b8a94d57cb972bf50831a0e22982`)
- Pinned registry entry `tracks[trackId=in_infraction_nondisclosure]`

The committed Indiana state pack carries build metadata and the Nationwide inventory only - two official PDFs and six resource files, all I.C. 35-38-9 expungement material - and records no track-level filing text. Participant steps in `participant-instructions.md` were taken from the track's `rules.filing`, `rules.fees`, `rules.service`, `rules.notice`, `packetInstructions` and `packetSet.participantActionRequired`, plus the state pack's own `filingDestinationGuidance` and `feesCopiesServiceNotes` for the "verify current local requirements" line.
