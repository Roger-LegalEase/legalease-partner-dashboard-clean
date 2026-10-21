# Handoff — ky_void_seal_controlled_substance (KY, lane C1, controlled pleading)

Job `T-C-KY-production-packet` · treatment `production_packet` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| KRS 218A.275(8) | The voiding power: after satisfactory completion of treatment, probation or other sentence on a first possession conviction, the court **may** void the conviction |
| KRS 218A.275(9) | On voiding, the court **shall** order the records sealed, except as provided in KRS 27A.099 |
| KRS 218A.275(10) | A voided conviction is not a first offence for later Chapter 218A purposes and is not a conviction for disqualifications or disabilities imposed by law |
| KRS 218A.275(12) | Voiding may occur only once; and the deferred-prosecution bar |
| KRS 27A.099 | Records excepted from sealing |
| KRS 431.078(2) | No five-year wait where the conviction was voided under 218A.275(8) — onward routing only, not relief requested here |

Official sources recorded on the track: AOC-334 Rev. 1-22 (kycourts.gov), KRS 218A.275, KRS 27A.099, and the Kentucky Circuit Court Clerks' Manual, July 2026 (recorded only as the Circuit Court portal root). **All four carry `sha256: null`.**

## Mechanism

Discretionary voiding, mandatory sealing on voiding. The court may void a first possession conviction after satisfactory completion of treatment, probation or other sentence, and shall then order the records sealed. Voiding may occur only once for any person. Records excepted by KRS 27A.099 are not sealed.

## Route decision

Custom pleading, drafted, with one official-form dependency. The registry declares `outputStrategy: custom_pleading`, `compositionMode: null`, `units: []`. `packetSet.components` lists three:

1. `…-primary-filing-1` — required, custom pleading. **Drafted.**
2. `…-proposed-order-2` — required, `official_pdf_fill`, `officialFormId: AOC-334`. **Not drafted — mandatory official-form handoff.**
3. `…-certificate-of-service-3` — required, custom pleading. **Drafted.**

The filing rule is explicit that AOC-334 is tendered with the motion, so the packet is not filing-complete until lane D/E delivers the form and its field map. See `components/ky_void_seal_controlled_substance-proposed-order-2/dependency.json`.

## What is deliberately absent

- **Proposed order text.** AOC-334 is the order. Official form; not drafted.
- **Verification / notarization.** Affirmatively absent, not unknown: the registry states *"none required. The motion is not verified."* `verificationStatute.citation` is `null` and no verification block is rendered. This differs from the ND config's missing-verification-statute case, where the source was silent; here the source answers the question.
- **Notice.** No summons issues; notice is effected by service on the prosecutor and is carried by the certificate of service.
- **Affidavit.** No source records one. Proof of completion is a conditional participant-obtained document the statute does not require to be filed.
- **Cover sheet.** Neither source records one.
- **Sovereign party role, division line, record custodian list.** Null or empty; no source supplies them. Custodians come only from the participant's `vcsAgencies` answer, and the order that names them is AOC-334.
- **Fee figure.** None quoted anywhere. The recorded rule is that there is no filing fee; a clerk who demands one is a stop condition.

## Open counsel flags (16)

**Build blocker.** KRS 218A.275(12) bars this relief to anyone who previously had a possession charge dismissed after a KRS 218A.14151 deferred prosecution. The controlling review does not record the bar. It changes who receives a packet at all and must be encoded and confirmed before the route is built. The screening question exists (`vcsPriorDeferredProsecution`); the gate is not ratified.

**Release blocker.** The static legal propositions the motion would assert about the effect of voiding and sealing — KRS 218A.275(9) and (10) — are unratified. The motion cannot go out until counsel ratifies them.

**Counsel classification.** KRS 218A.14151 deferred prosecution is an adjacent mechanism the controlling review never identifies (AOC-331 application, AOC-333 sealing order). Recorded as an observation; not normalized.

**Official-form dependency.** AOC-334, the required tendered order.

Scope and self-help boundaries carried as flags: first-offence status is the participant's own fact and never a generated conclusion; once-only voiding; sealing is not expungement; onward KRS 431.078 routing only after voiding; non-citizen stop; void-versus-expunge strategy stop; clerk-demands-a-fee stop; all court identity and outside-party fields blank.

Gates: `legalStatus: legal_review_pending`, `legalDesignStatus: legal_design_approved_with_limitations`, `implementationQueue: F_source_problem`; output, visual and technical-proof review all outstanding; four official sources with no hash.

## F-review pointers

- **F / source freshness** — four official sources, `sha256: null` on every one. AOC-334 has a direct kycourts.gov URL but no captured copy or hash anywhere in this repository. The Clerks' Manual is cited as the authority for the motion type, the no-summons rule, the clerk-to-judge routing and the no-fee rule, yet is recorded only as `https://www.kycourts.gov/Courts/Circuit-Court/Pages/default.aspx` — a portal root, not the Manual. That is the weakest citation on this track and it carries four separate operative rules.
- **F / source gap, highest value in this jurisdiction** — the compiled KY profile does not record this mechanism at all. Its five pathways are KRS 431.078, KRS 431.073, KRS 431.076 and two juvenile routes; the strings `218A.275`, `27A.099` and `AOC-334` appear nowhere in the 87 KB profile. The Kentucky Nationwide source corpus behind that profile is six AOC PDFs, one PDF reference file and two HTML reference files, all expungement-side. So the void-and-seal mechanism is invisible to the compiled engine while being live in the registry. Regenerating the KY profile against a corpus that includes Chapter 218A is the single highest-value source action for this state.
- **F / terminology conflict** — `profile:terminology.primaryConsumerTerm` is `expungement` with `avoidUniversalExpungementLabel: true`, and `profile:terminology.allowedStateTerms` is `["expungement", "vacatur/vacation", "pardon"]`. Neither *voiding* nor *sealing* is in the allowed list, yet this track's remedy is exactly those two. The profile's own copy guardrail ("do not relabel every remedy as expungement") points the right way; the allowed-terms list needs *voiding* and *sealing* added.
- **F / open research** — the scope of KRS 27A.099. The motion and the participant copy both say records excepted by KRS 27A.099 are not reached; neither can say which records those are.
- **F / composite relief naming** — no source supplies a one-word name for the composite remedy. `primaryReliefTerm` is set to `sealing` with the voiding carried as the relief action verb; if counsel prefers a composite label, that is a config change, not a source question.

## Evidence

- `src/lib/rcap/state-packs/kentucky/index.ts`, `src/lib/rcap/state-packs/kentucky/all50-build-metadata.ts`
- `src/lib/rcap-engine/compiled/profiles/KY-kentucky.json` (sha256 `441a89c697a0443e6b429e4f3be750d26af5e1bb31afbabd61800f020394b438`)
- Pinned registry entry `tracks[trackId=ky_void_seal_controlled_substance]`

The committed Kentucky state pack records build metadata and the Nationwide inventory only; it carries no track-level filing text and no pleading vocabulary. Every filing step in `participant-instructions.md` comes from the track's `rules`, `packetInstructions`, `packetSet.participantActionRequired` and `selfHelpStopConditions`.

## Renderer-compatibility findings (observed, not theoretical)

A rendered sample of this track's canonical fixture was produced in this worktree against `src/lib/record-clearing/renderers/custom-pleading-renderer.ts`. Three defects showed up. All are renderer/adapter defects; no source-faithful field was changed to hide them.

1. **`usesCounty: true` is Pennsylvania mode.** The flag is documented as a county-line switch, but its true branch hardcodes *"the Court of Common Pleas of {county} County, Pennsylvania"* into the jurisdiction and venue paragraphs and *"The Pennsylvania State Police, {county} County Court of Common Pleas"* into the custodian line. The first sample put Pennsylvania into a Kentucky filing. **Fixed in the config**: `usesCounty` is now `false` and the county rides the `{county}` token in `courtName` / `venueDescriptor`, the way the ND config handles it. The renderer should separate "uses a county line" from "is Pennsylvania".
2. **Nulls are stringified.** Fields deliberately left `null` under the sourced-content-only rule printed as the literal word `null` — in the caption party role, in the parties block, and inside the verification clause. `null` is the convention this artifact set is required to use for unsourced values, so the adapter must omit the line or clause instead of stringifying it.
3. **A verification section was emitted anyway.** This track's registry entry says in terms *"none required. The motion is not verified."*, and `componentInventory` marks verification absent — yet a `VI. VERIFICATION` block with a truth-of-statements clause was rendered. That is precisely the invention this artifact set exists to prevent. See `rendererCompatibility.adapterDefects` in the config for the exact required behaviour.

`rendererCompatibility` in the pleading config records all of this in machine-readable form.
