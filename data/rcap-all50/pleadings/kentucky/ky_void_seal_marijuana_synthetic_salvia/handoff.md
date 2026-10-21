# Handoff — ky_void_seal_marijuana_synthetic_salvia (KY, lane C1, controlled pleading)

Job `T-C-KY-production-packet` · treatment `production_packet` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| KRS 218A.276(1) | The fixed offence list: marijuana (KRS 218A.1422), synthetic drugs (KRS 218A.1430), salvia (KRS 218A.1451) |
| KRS 218A.276(8) | The voiding power after satisfactory completion of treatment, probation or other sentence on a first conviction |
| KRS 218A.276(9) | On voiding, the court **shall** order the records sealed; KRS 27A.099 records are not reached |
| KRS 218A.276(10) | The proceedings may not be used against the defendant except to determine eligibility, and the participant need not disclose them |
| KRS 27A.099 | Records excepted from sealing |
| KRS 431.078(2) | No five-year wait where the conviction was voided under 218A.276(8) — onward routing only |

Official sources recorded on the track: AOC-334 Rev. 1-22 (kycourts.gov), KRS 218A.276, KRS 27A.099, and the Kentucky Circuit Court Clerks' Manual, July 2026 (recorded only as the Circuit Court portal root). **All four carry `sha256: null`.**

## Mechanism

Discretionary voiding, mandatory sealing on voiding, on a closed list of three possession offences. Same structure as the KRS 218A.275 controlled-substance track, with two differences: the offence list is fixed by subsection (1) rather than being "possession of a controlled substance" generally, and subsection (10) adds the non-use and non-disclosure effects rather than the first-offence/disqualification effects.

## Route decision

Custom pleading, drafted, with one official-form dependency. `outputStrategy: custom_pleading`, `compositionMode: null`, `units: []`. `packetSet.components` lists three:

1. `…-primary-filing-1` — required, custom pleading. **Drafted.**
2. `…-proposed-order-2` — required, `official_pdf_fill`, `officialFormId: AOC-334`. **Not drafted — mandatory official-form handoff.**
3. `…-certificate-of-service-3` — required, custom pleading. **Drafted.**

AOC-334 is the *same* form the KRS 218A.275 track tenders — identical `officialFormId` and `officialSourceUrl` on both registry entries. One acquisition and one field map serve both Kentucky void-and-seal tracks; the form must be parameterised for each branch. See `components/ky_void_seal_marijuana_synthetic_salvia-proposed-order-2/dependency.json`.

## What is deliberately absent

- **Proposed order text.** AOC-334 is the order. Official form; not drafted.
- **Verification / notarization.** Affirmatively absent, not unknown: *"none required. The motion is not verified."* `verificationStatute.citation` is `null` and no verification block is rendered. This is a different case from the ND config's missing-verification-statute flag, where the source was silent.
- **Notice.** No summons issues; notice is effected by service on the prosecutor.
- **Affidavit, cover sheet.** No source records either.
- **Any statement about the legal status of marijuana, synthetic drugs or salvia in Kentucky.** No source read for this track addresses it. `qaProhibitedTerms` bars *decriminalized* and *legalized* on top of the expungement vocabulary.
- **Sovereign party role, division line, record custodian list, fee figure.** Null, empty or unquoted; no source supplies them.

## Open counsel flags (16)

**No build blocker on this track** — `buildBlockers` is empty, unlike its KRS 218A.275 sibling, which carries the unencoded KRS 218A.275(12) deferred-prosecution bar. That is the single structural difference between the two tracks' review posture.

**Release blocker.** The static legal propositions the motion would assert about the effect of voiding and sealing — KRS 218A.276(9) and (10) — are unratified.

**Official-form dependency.** AOC-334, the required tendered order.

Scope and self-help boundaries carried as flags: the offence list is fixed and no argument by analogy may be generated; no legal-status or decriminalization argument; first-offence status is the participant's own fact; once-only voiding; sealing is not expungement; onward KRS 431.078 routing only after voiding; non-citizen stop; void-versus-expunge strategy stop; clerk-demands-a-fee stop; all court identity and outside-party fields blank.

Gates: `legalStatus: legal_review_pending`, `legalDesignStatus: legal_design_approved_with_limitations`, `implementationQueue: F_source_problem`; output, visual and technical-proof review outstanding; four official sources with no hash.

## F-review pointers

- **F / source freshness** — four official sources, `sha256: null` on every one. The Clerks' Manual carries the motion-type, no-summons and no-fee rules yet is cited only as a portal root.
- **F / source gap** — the compiled KY profile does not record this mechanism. `218A.276`, `27A.099` and `AOC-334` appear nowhere in the 87 KB profile; its five pathways are the expungement/vacatur family plus two juvenile routes. The Kentucky Nationwide corpus behind it is six AOC PDFs (496.2, 496.3, 497.2, JV-29, JV-29.1, JV-30), one PDF reference file and two HTML reference files, all expungement-side. Regenerating the KY profile against a corpus including Chapter 218A is the highest-value source action for this state, and it fixes three tracks at once.
- **F / terminology conflict** — `profile:terminology.allowedStateTerms` is `["expungement", "vacatur/vacation", "pardon"]`. Neither *voiding* nor *sealing* is on it, yet this track's remedy is exactly those two. The list needs both added.
- **F / release characterisation** — the registry's packet instruction calls the KRS 431.078(2) route "the only route in Kentucky to same-year misdemeanor expungement". That is a comparative claim about the whole Kentucky remedy set, and it is stated only in the registry's own words; it should be ratified before it reaches a participant. It is currently carried in participant copy as "the fastest route Kentucky has", which is softer, and even that should be reviewed.
- **F / open research** — the scope of KRS 27A.099.

## Evidence

- `src/lib/rcap/state-packs/kentucky/index.ts`, `src/lib/rcap/state-packs/kentucky/all50-build-metadata.ts`
- `src/lib/rcap-engine/compiled/profiles/KY-kentucky.json` (sha256 `441a89c697a0443e6b429e4f3be750d26af5e1bb31afbabd61800f020394b438`)
- Pinned registry entry `tracks[trackId=ky_void_seal_marijuana_synthetic_salvia]`

The committed Kentucky state pack records build metadata and the Nationwide inventory only. Every filing step in `participant-instructions.md` comes from the track's `rules`, `packetInstructions`, `packetSet.participantActionRequired` and `selfHelpStopConditions`.

## Renderer-compatibility findings (observed, not theoretical)

A rendered sample of this track's canonical fixture was produced in this worktree against `src/lib/record-clearing/renderers/custom-pleading-renderer.ts`. Three defects showed up. All are renderer/adapter defects; no source-faithful field was changed to hide them.

1. **`usesCounty: true` is Pennsylvania mode.** The flag is documented as a county-line switch, but its true branch hardcodes *"the Court of Common Pleas of {county} County, Pennsylvania"* into the jurisdiction and venue paragraphs and *"The Pennsylvania State Police, {county} County Court of Common Pleas"* into the custodian line. The first sample put Pennsylvania into a Kentucky filing. **Fixed in the config**: `usesCounty` is now `false` and the county rides the `{county}` token in `courtName` / `venueDescriptor`, the way the ND config handles it. The renderer should separate "uses a county line" from "is Pennsylvania".
2. **Nulls are stringified.** Fields deliberately left `null` under the sourced-content-only rule printed as the literal word `null` — in the caption party role, in the parties block, and inside the verification clause. `null` is the convention this artifact set is required to use for unsourced values, so the adapter must omit the line or clause instead of stringifying it.
3. **A verification section was emitted anyway.** The registry says *"none required. The motion is not verified."* and `componentInventory` marks verification absent, yet a verification block was rendered. See `rendererCompatibility.adapterDefects` in the config for the exact required behaviour.

`rendererCompatibility` in the pleading config records all of this in machine-readable form.
